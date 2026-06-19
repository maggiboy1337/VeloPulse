using LiveTracking.Application.DTOs.Live;
using LiveTracking.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiveTracking.Api.Controllers;

[ApiController]
[Route("api/public/live-sessions")]
public class PublicLiveSessionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PublicLiveSessionsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<PublicLiveSessionDto>>> GetActiveSessions()
    {
        try
        {
            var activeSessions = await _context.LiveSessions
                .AsNoTracking()
                .Include(ls => ls.Activity)
                    .ThenInclude(a => a.Route)
                .Include(ls => ls.User)
                    .ThenInclude(u => u.Profile)
                .Include(ls => ls.Snapshots)
                .Where(ls => ls.IsPublic && ls.EndedAt == null)
                .ToListAsync();

            var result = new List<PublicLiveSessionDto>();

            foreach (var ls in activeSessions)
            {
                try
                {
                    // Skip if User is null (should not happen, but defensive programming)
                    if (ls.User == null)
                        continue;

                    // Get route points separately with a limit to avoid timeout
                    List<RoutePointDto> routePoints = new List<RoutePointDto>();
                    if (ls.Activity?.Route != null)
                    {
                        var points = await _context.RoutePoints
                            .AsNoTracking()
                            .Where(rp => rp.RouteId == ls.Activity.Route.Id)
                            .OrderBy(rp => rp.SequenceNumber)
                            .Take(500) // Limit to 500 points for performance
                            .Select(rp => new RoutePointDto(rp.Latitude, rp.Longitude, rp.ElevationMeters))
                            .ToListAsync();
                        routePoints = points;
                    }

                    // Get activity points (actual GPS track)
                    List<ActivityPointDto> activityPoints = new List<ActivityPointDto>();
                    if (ls.Activity != null)
                    {
                        var points = await _context.ActivityPoints
                            .AsNoTracking()
                            .Where(ap => ap.ActivityId == ls.Activity.Id)
                            .OrderBy(ap => ap.Timestamp)
                            .Take(1000) // Limit to last 1000 points for performance
                            .Select(ap => new ActivityPointDto(ap.Latitude, ap.Longitude, ap.Timestamp))
                            .ToListAsync();
                        activityPoints = points;
                    }

                    var latestSnapshot = ls.Snapshots?.OrderByDescending(s => s.TimestampUtc).FirstOrDefault();

                    var displayName = ls.User.Profile?.DisplayName ?? "Anonymous";
                    var profileImageUrl = ls.User.Profile?.ProfileImageUrl;
                    var shareSpeed = ls.User.Profile?.ShareSpeed ?? false;
                    var shareHeartRate = ls.User.Profile?.ShareHeartRate ?? false;

                    result.Add(new PublicLiveSessionDto(
                        ls.PublicSessionId,
                        displayName,
                        profileImageUrl,
                        ls.StartedAt,
                        latestSnapshot != null
                            ? new PublicLiveSnapshotDto(
                                latestSnapshot.TimestampUtc,
                                latestSnapshot.Latitude,
                                latestSnapshot.Longitude,
                                latestSnapshot.GpsAccuracyMeters,
                                shareSpeed ? latestSnapshot.SpeedKmh : null,
                                latestSnapshot.DistanceCompletedMeters,
                                latestSnapshot.DistanceRemainingMeters,
                                latestSnapshot.RouteProgressPercent,
                                shareHeartRate ? latestSnapshot.HeartRateBpm : null
                            )
                            : null,
                        routePoints,
                        activityPoints  // Add actual GPS track
                    ));
                }
                catch (Exception ex)
                {
                    // Log and skip this session
                    Console.WriteLine($"Error processing live session {ls.PublicSessionId}: {ex.Message}");
                    continue;
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetActiveSessions: {ex}");
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }

    [HttpGet("{publicSessionId}")]
    public async Task<ActionResult<PublicLiveSessionDto>> GetSession(string publicSessionId)
    {
        try
        {
            var session = await _context.LiveSessions
                .AsNoTracking()
                .Include(ls => ls.Activity)
                    .ThenInclude(a => a.Route)
                .Include(ls => ls.User)
                    .ThenInclude(u => u.Profile)
                .Include(ls => ls.Snapshots)
                .Where(ls => ls.PublicSessionId == publicSessionId && ls.IsPublic)
                .FirstOrDefaultAsync();

            if (session == null)
            {
                return NotFound(new { message = "Session not found or not public" });
            }

            if (session.User == null)
            {
                return StatusCode(500, new { message = "Session data is invalid" });
            }

            // Get route points separately with a limit
            List<RoutePointDto> routePoints = new List<RoutePointDto>();
            if (session.Activity?.Route != null)
            {
                var points = await _context.RoutePoints
                    .AsNoTracking()
                    .Where(rp => rp.RouteId == session.Activity.Route.Id)
                    .OrderBy(rp => rp.SequenceNumber)
                    .Take(500) // Limit to 500 points
                    .Select(rp => new RoutePointDto(rp.Latitude, rp.Longitude, rp.ElevationMeters))
                    .ToListAsync();
                routePoints = points;
            }

            var latestSnapshot = session.Snapshots?.OrderByDescending(s => s.TimestampUtc).FirstOrDefault();

            var displayName = session.User.Profile?.DisplayName ?? "Anonymous";
            var profileImageUrl = session.User.Profile?.ProfileImageUrl;
            var shareSpeed = session.User.Profile?.ShareSpeed ?? false;
            var shareHeartRate = session.User.Profile?.ShareHeartRate ?? false;

            var result = new PublicLiveSessionDto(
                session.PublicSessionId,
                displayName,
                profileImageUrl,
                session.StartedAt,
                latestSnapshot != null
                    ? new PublicLiveSnapshotDto(
                        latestSnapshot.TimestampUtc,
                        latestSnapshot.Latitude,
                        latestSnapshot.Longitude,
                        latestSnapshot.GpsAccuracyMeters,
                        shareSpeed ? latestSnapshot.SpeedKmh : null,
                        latestSnapshot.DistanceCompletedMeters,
                        latestSnapshot.DistanceRemainingMeters,
                        latestSnapshot.RouteProgressPercent,
                        shareHeartRate ? latestSnapshot.HeartRateBpm : null
                    )
                    : null,
                routePoints
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetSession: {ex}");
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }
}
