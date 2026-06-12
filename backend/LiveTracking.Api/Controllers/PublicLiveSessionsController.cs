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

            var latestSnapshot = ls.Snapshots.OrderByDescending(s => s.TimestampUtc).FirstOrDefault();

            result.Add(new PublicLiveSessionDto(
                ls.PublicSessionId,
                ls.User.Profile != null ? ls.User.Profile.DisplayName : "Anonymous",
                ls.User.Profile != null ? ls.User.Profile.ProfileImageUrl : null,
                ls.StartedAt,
                latestSnapshot != null && ls.User.Profile != null
                    ? new PublicLiveSnapshotDto(
                        latestSnapshot.TimestampUtc,
                        latestSnapshot.Latitude,
                        latestSnapshot.Longitude,
                        latestSnapshot.GpsAccuracyMeters,
                        ls.User.Profile.ShareSpeed ? latestSnapshot.SpeedKmh : null,
                        latestSnapshot.DistanceCompletedMeters,
                        latestSnapshot.DistanceRemainingMeters,
                        latestSnapshot.RouteProgressPercent,
                        ls.User.Profile.ShareHeartRate ? latestSnapshot.HeartRateBpm : null
                    )
                    : null,
                routePoints
            ));
        }

        return Ok(result);
    }

    [HttpGet("{publicSessionId}")]
    public async Task<ActionResult<PublicLiveSessionDto>> GetSession(string publicSessionId)
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

        var latestSnapshot = session.Snapshots.OrderByDescending(s => s.TimestampUtc).FirstOrDefault();

        var result = new PublicLiveSessionDto(
            session.PublicSessionId,
            session.User.Profile != null ? session.User.Profile.DisplayName : "Anonymous",
            session.User.Profile != null ? session.User.Profile.ProfileImageUrl : null,
            session.StartedAt,
            latestSnapshot != null && session.User.Profile != null
                ? new PublicLiveSnapshotDto(
                    latestSnapshot.TimestampUtc,
                    latestSnapshot.Latitude,
                    latestSnapshot.Longitude,
                    latestSnapshot.GpsAccuracyMeters,
                    session.User.Profile.ShareSpeed ? latestSnapshot.SpeedKmh : null,
                    latestSnapshot.DistanceCompletedMeters,
                    latestSnapshot.DistanceRemainingMeters,
                    latestSnapshot.RouteProgressPercent,
                    session.User.Profile.ShareHeartRate ? latestSnapshot.HeartRateBpm : null
                )
                : null,
            routePoints
        );

        return Ok(result);
    }
}
