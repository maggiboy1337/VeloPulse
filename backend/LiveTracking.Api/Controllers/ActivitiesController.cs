using LiveTracking.Application.DTOs.Activities;
using LiveTracking.Domain.Entities;
using LiveTracking.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LiveTracking.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/activities")]
public class ActivitiesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ActivitiesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<ActivityDto>> StartActivity([FromBody] StartActivityRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var activity = new Activity
        {
            UserId = userId,
            RouteId = request.RouteId,
            Name = request.Name,
            Status = ActivityStatus.Active,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetActivity), new { id = activity.Id }, new ActivityDto(
            activity.Id,
            activity.Name,
            activity.Status.ToString(),
            activity.StartedAt,
            activity.FinishedAt,
            activity.TotalDistanceMeters,
            activity.AverageSpeedKmh,
            activity.RouteId,
            null
        ));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ActivityDto>> GetActivity(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var activity = await _context.Activities
            .Include(a => a.Route)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null) return NotFound();

        return Ok(new ActivityDto(
            activity.Id,
            activity.Name,
            activity.Status.ToString(),
            activity.StartedAt,
            activity.FinishedAt,
            activity.TotalDistanceMeters,
            activity.AverageSpeedKmh,
            activity.RouteId,
            activity.Route?.Name
        ));
    }

    [HttpPost("{id}/pause")]
    public async Task<IActionResult> PauseActivity(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var activity = await _context.Activities.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null) return NotFound();
        if (activity.Status != ActivityStatus.Active) return BadRequest(new { message = "Activity is not active" });

        activity.Status = ActivityStatus.Paused;
        activity.PausedAt = DateTime.UtcNow;
        activity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/resume")]
    public async Task<IActionResult> ResumeActivity(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var activity = await _context.Activities.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null) return NotFound();
        if (activity.Status != ActivityStatus.Paused) return BadRequest(new { message = "Activity is not paused" });

        activity.Status = ActivityStatus.Active;
        activity.PausedAt = null;
        activity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/finish")]
    public async Task<IActionResult> FinishActivity(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var activity = await _context.Activities
            .Include(a => a.ActivityPoints)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null) return NotFound();

        activity.Status = ActivityStatus.Finished;
        activity.FinishedAt = DateTime.UtcNow;
        activity.UpdatedAt = DateTime.UtcNow;

        // Calculate statistics
        if (activity.ActivityPoints.Any())
        {
            var speeds = activity.ActivityPoints.Where(p => p.SpeedKmh.HasValue).Select(p => p.SpeedKmh!.Value).ToList();
            var heartRates = activity.ActivityPoints.Where(p => p.HeartRateBpm.HasValue).Select(p => p.HeartRateBpm!.Value).ToList();

            activity.AverageSpeedKmh = speeds.Any() ? speeds.Average() : null;
            activity.MaxSpeedKmh = speeds.Any() ? speeds.Max() : null;
            activity.AverageHeartRateBpm = heartRates.Any() ? (int)heartRates.Average() : null;
            activity.MaxHeartRateBpm = heartRates.Any() ? heartRates.Max() : null;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/points")]
    public async Task<IActionResult> AddActivityPoint(Guid id, [FromBody] ActivityPointRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var activity = await _context.Activities.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null) return NotFound();
        if (activity.Status != ActivityStatus.Active) return BadRequest(new { message = "Activity is not active" });

        var lastPoint = await _context.ActivityPoints
            .Where(p => p.ActivityId == id)
            .OrderByDescending(p => p.Timestamp)
            .FirstOrDefaultAsync();

        double distanceFromStart = lastPoint?.DistanceFromStartMeters ?? 0;

        if (lastPoint != null)
        {
            distanceFromStart += CalculateDistance(
                lastPoint.Latitude, lastPoint.Longitude,
                request.Latitude, request.Longitude
            );
        }

        var point = new ActivityPoint
        {
            ActivityId = id,
            Timestamp = request.Timestamp,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            ElevationMeters = request.ElevationMeters,
            SpeedKmh = request.SpeedKmh,
            AccuracyMeters = request.AccuracyMeters,
            HeartRateBpm = request.HeartRateBpm,
            CadenceRpm = request.CadenceRpm,
            PowerWatts = request.PowerWatts,
            DistanceFromStartMeters = distanceFromStart,
            CreatedAt = DateTime.UtcNow
        };

        _context.ActivityPoints.Add(point);
        activity.TotalDistanceMeters = distanceFromStart;
        activity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000;
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
