using LiveTracking.Api.Hubs;
using LiveTracking.Application.DTOs.Live;
using LiveTracking.Domain.Entities;
using LiveTracking.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;

namespace LiveTracking.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/live-sessions")]
public class LiveSessionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<LiveTrackingHub> _hubContext;

    public LiveSessionsController(ApplicationDbContext context, IHubContext<LiveTrackingHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpPost]
    public async Task<ActionResult<LiveSessionDto>> StartLiveSession([FromBody] StartLiveSessionRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var activity = await _context.Activities
            .FirstOrDefaultAsync(a => a.Id == request.ActivityId && a.UserId == userId);

        if (activity == null) return NotFound(new { message = "Activity not found" });
        if (activity.Status != ActivityStatus.Active) return BadRequest(new { message = "Activity is not active" });

        var existingSession = await _context.LiveSessions
            .FirstOrDefaultAsync(ls => ls.ActivityId == request.ActivityId);

        if (existingSession != null)
            return BadRequest(new { message = "Live session already exists for this activity" });

        var publicSessionId = GeneratePublicSessionId();

        var session = new LiveSession
        {
            ActivityId = request.ActivityId,
            UserId = userId,
            PublicSessionId = publicSessionId,
            IsPublic = request.IsPublic,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.LiveSessions.Add(session);
        await _context.SaveChangesAsync();

        if (request.IsPublic)
        {
            await NotifySessionStarted(session);
        }

        return CreatedAtAction(nameof(GetLiveSession), new { id = session.Id }, new LiveSessionDto(
            session.Id,
            session.PublicSessionId,
            session.IsPublic,
            session.StartedAt,
            session.EndedAt,
            session.ActivityId
        ));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LiveSessionDto>> GetLiveSession(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var session = await _context.LiveSessions
            .FirstOrDefaultAsync(ls => ls.Id == id && ls.UserId == userId);

        if (session == null) return NotFound();

        return Ok(new LiveSessionDto(
            session.Id,
            session.PublicSessionId,
            session.IsPublic,
            session.StartedAt,
            session.EndedAt,
            session.ActivityId
        ));
    }

    [HttpGet("my-active")]
    public async Task<ActionResult<List<LiveSessionDto>>> GetMyActiveSessions()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var sessions = await _context.LiveSessions
            .Where(ls => ls.UserId == userId && ls.EndedAt == null)
            .OrderByDescending(ls => ls.StartedAt)
            .ToListAsync();

        return Ok(sessions.Select(session => new LiveSessionDto(
            session.Id,
            session.PublicSessionId,
            session.IsPublic,
            session.StartedAt,
            session.EndedAt,
            session.ActivityId
        )).ToList());
    }

    [HttpPut("{id}/visibility")]
    public async Task<IActionResult> UpdateVisibility(Guid id, [FromBody] UpdateVisibilityRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var session = await _context.LiveSessions
            .FirstOrDefaultAsync(ls => ls.Id == id && ls.UserId == userId);

        if (session == null) return NotFound();

        var wasPublic = session.IsPublic;
        session.IsPublic = request.IsPublic;
        session.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (request.IsPublic && !wasPublic)
        {
            await NotifySessionStarted(session);
        }
        else if (!request.IsPublic && wasPublic)
        {
            await _hubContext.SendLiveSessionEnded(session.PublicSessionId);
        }

        return NoContent();
    }

    [HttpPost("{id}/snapshots")]
    public async Task<IActionResult> AddSnapshot(Guid id, [FromBody] LiveSnapshotRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var session = await _context.LiveSessions
            .Include(ls => ls.User.Profile)
            .FirstOrDefaultAsync(ls => ls.Id == id && ls.UserId == userId);

        if (session == null) return NotFound();

        var snapshot = new LiveSnapshot
        {
            LiveSessionId = id,
            PublicSessionId = session.PublicSessionId,
            TimestampUtc = DateTime.UtcNow,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GpsAccuracyMeters = request.GpsAccuracyMeters,
            SpeedKmh = request.SpeedKmh,
            DistanceCompletedMeters = request.DistanceCompletedMeters,
            DistanceRemainingMeters = request.DistanceRemainingMeters,
            RouteProgressPercent = request.RouteProgressPercent,
            HeartRateBpm = request.HeartRateBpm,
            CadenceRpm = request.CadenceRpm,
            PowerWatts = request.PowerWatts,
            CreatedAt = DateTime.UtcNow
        };

        _context.LiveSnapshots.Add(snapshot);
        await _context.SaveChangesAsync();

        if (session.IsPublic)
        {
            var profile = session.User.Profile;
            var publicSnapshot = new PublicLiveSnapshotDto(
                snapshot.TimestampUtc,
                snapshot.Latitude,
                snapshot.Longitude,
                snapshot.GpsAccuracyMeters,
                profile?.ShareSpeed == true ? snapshot.SpeedKmh : null,
                snapshot.DistanceCompletedMeters,
                snapshot.DistanceRemainingMeters,
                snapshot.RouteProgressPercent,
                profile?.ShareHeartRate == true ? snapshot.HeartRateBpm : null
            );

            await _hubContext.SendLiveSessionUpdated(session.PublicSessionId, publicSnapshot);
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> EndLiveSession(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var session = await _context.LiveSessions
            .FirstOrDefaultAsync(ls => ls.Id == id && ls.UserId == userId);

        if (session == null) return NotFound();

        session.EndedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (session.IsPublic)
        {
            await _hubContext.SendLiveSessionEnded(session.PublicSessionId);
        }

        return NoContent();
    }

    private static string GeneratePublicSessionId()
    {
        var bytes = new byte[16];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("/", "_").Replace("+", "-").TrimEnd('=');
    }

    private async Task NotifySessionStarted(LiveSession session)
    {
        var user = await _context.Users
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == session.UserId);

        var activity = await _context.Activities
            .Include(a => a.Route!)
            .ThenInclude(r => r.RoutePoints)
            .FirstOrDefaultAsync(a => a.Id == session.ActivityId);

        Console.WriteLine($"NotifySessionStarted - Activity: {activity?.Id}, Route: {activity?.Route?.Id}, RoutePoints Count: {activity?.Route?.RoutePoints?.Count ?? 0}");

        var routePoints = activity?.Route?.RoutePoints
            .OrderBy(rp => rp.SequenceNumber)
            .Select(rp => new Application.DTOs.Live.RoutePointDto(
                rp.Latitude,
                rp.Longitude,
                rp.ElevationMeters
            ))
            .ToList();

        Console.WriteLine($"NotifySessionStarted - RoutePoints to send: {routePoints?.Count ?? 0}");

        var publicSession = new PublicLiveSessionDto(
            session.PublicSessionId,
            user?.Profile?.DisplayName ?? "Anonymous",
            user?.Profile?.ProfileImageUrl,
            session.StartedAt,
            null,
            routePoints
        );

        await _hubContext.SendLiveSessionStarted(session.PublicSessionId, publicSession);
    }
}
