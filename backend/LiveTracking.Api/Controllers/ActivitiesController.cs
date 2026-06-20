using LiveTracking.Api.Hubs;
using LiveTracking.Application.DTOs.Activities;
using LiveTracking.Domain.Entities;
using LiveTracking.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LiveTracking.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/activities")]
public class ActivitiesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<LiveTrackingHub> _hubContext;

    public ActivitiesController(ApplicationDbContext context, IHubContext<LiveTrackingHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
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

    [HttpGet]
    public async Task<ActionResult<List<ActivityDto>>> GetActivities(
        [FromQuery] string? status = null,
        [FromQuery] int? limit = null)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var query = _context.Activities
            .Include(a => a.Route)
            .Where(a => a.UserId == userId);

        // Filter by status if provided
        if (!string.IsNullOrEmpty(status))
        {
            if (Enum.TryParse<ActivityStatus>(status, true, out var statusEnum))
            {
                query = query.Where(a => a.Status == statusEnum);
            }
        }

        // Order by most recent first
        query = query.OrderByDescending(a => a.StartedAt);

        // Limit results if specified
        if (limit.HasValue && limit.Value > 0)
        {
            query = query.Take(limit.Value);
        }

        var activities = await query.ToListAsync();

        var result = activities.Select(a => new ActivityDto(
            a.Id,
            a.Name,
            a.Status.ToString(),
            a.StartedAt,
            a.FinishedAt,
            a.TotalDistanceMeters,
            a.AverageSpeedKmh,
            a.RouteId,
            a.Route?.Name
        )).ToList();

        return Ok(result);
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

    [HttpGet("{id}/details")]
    public async Task<ActionResult<ActivityDetailDto>> GetActivityDetails(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var activity = await _context.Activities
            .Include(a => a.Route)
            .Include(a => a.ActivityPoints.OrderBy(p => p.Timestamp))
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null) return NotFound();

        // Sample points if there are too many (max 1000 for performance)
        var points = activity.ActivityPoints.ToList();
        if (points.Count > 1000)
        {
            var samplingRate = (int)Math.Ceiling((double)points.Count / 1000);
            points = points.Where((p, index) => index % samplingRate == 0 || index == points.Count - 1).ToList();
        }

        var pointDtos = points.Select(p => new ActivityPointDto(
            p.Timestamp,
            p.Latitude,
            p.Longitude,
            p.ElevationMeters,
            p.SpeedKmh,
            p.AccuracyMeters,
            p.DistanceFromStartMeters
        )).ToList();

        var durationMinutes = activity.FinishedAt.HasValue 
            ? (int)(activity.FinishedAt.Value - activity.StartedAt).TotalMinutes 
            : (int)(DateTime.UtcNow - activity.StartedAt).TotalMinutes;

        return Ok(new ActivityDetailDto(
            activity.Id,
            activity.Name ?? "Unbenannte Tour",
            activity.Status.ToString(),
            activity.StartedAt,
            activity.FinishedAt,
            activity.TotalDistanceMeters,
            activity.AverageSpeedKmh,
            activity.MaxSpeedKmh,
            activity.AverageHeartRateBpm,
            activity.MaxHeartRateBpm,
            durationMinutes,
            activity.RouteId,
            activity.Route?.Name,
            pointDtos
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

        // WICHTIG: Auch die zugehörige LiveSession beenden, falls vorhanden
        var liveSession = await _context.LiveSessions
            .FirstOrDefaultAsync(ls => ls.ActivityId == id && ls.UserId == userId && ls.EndedAt == null);

        if (liveSession != null)
        {
            liveSession.EndedAt = DateTime.UtcNow;
            liveSession.UpdatedAt = DateTime.UtcNow;
            Console.WriteLine($"✅ LiveSession {liveSession.Id} automatisch beendet (Activity: {id})");

            // SignalR: Benachrichtigung an öffentliche Karte senden
            if (liveSession.IsPublic)
            {
                await _hubContext.SendLiveSessionEnded(liveSession.PublicSessionId);
                Console.WriteLine($"📡 SignalR: LiveSession beendet gesendet (PublicSessionId: {liveSession.PublicSessionId})");
            }
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
