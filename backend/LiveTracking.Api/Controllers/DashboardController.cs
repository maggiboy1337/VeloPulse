using LiveTracking.Application.DTOs.Dashboard;
using LiveTracking.Domain.Entities;
using LiveTracking.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LiveTracking.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DashboardController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> GetDashboard()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Get all finished activities for the user
        var finishedActivities = await _context.Activities
            .Where(a => a.UserId == userId && a.Status == ActivityStatus.Finished)
            .OrderByDescending(a => a.FinishedAt)
            .ToListAsync();

        // Calculate statistics
        var stats = CalculateStats(finishedActivities);

        // Get recent activities (last 10)
        var recentActivities = finishedActivities
            .Take(10)
            .Select(a => new RecentActivityDto(
                a.Id,
                a.Name ?? "Unbenannte Tour",
                a.StartedAt,
                a.FinishedAt,
                a.TotalDistanceMeters / 1000.0, // Convert to km
                a.AverageSpeedKmh,
                a.FinishedAt.HasValue 
                    ? (int)(a.FinishedAt.Value - a.StartedAt).TotalMinutes 
                    : 0,
                a.Status.ToString()
            ))
            .ToList();

        // Get active sessions
        var activeSessions = await _context.LiveSessions
            .Include(ls => ls.Activity)
            .Where(ls => ls.UserId == userId && ls.EndedAt == null)
            .Select(ls => new ActiveSessionDto(
                ls.Id,
                ls.PublicSessionId,
                ls.ActivityId,
                ls.Activity.Name ?? "Unbenannte Tour",
                ls.StartedAt,
                ls.Activity.TotalDistanceMeters / 1000.0, // Convert to km
                (int)(DateTime.UtcNow - ls.StartedAt).TotalMinutes,
                ls.IsPublic
            ))
            .ToListAsync();

        var dashboard = new DashboardDto(
            stats,
            recentActivities,
            activeSessions
        );

        return Ok(dashboard);
    }

    private DashboardStatsDto CalculateStats(List<Activity> activities)
    {
        if (!activities.Any())
        {
            return new DashboardStatsDto(0, 0, 0, 0, 0, 0, 0, 0);
        }

        // Total distance in km
        var totalDistanceKm = activities.Sum(a => a.TotalDistanceMeters) / 1000.0;

        // Total activities
        var totalActivities = activities.Count;

        // Total duration in minutes
        var totalDurationMinutes = activities
            .Where(a => a.FinishedAt.HasValue)
            .Sum(a => (int)(a.FinishedAt!.Value - a.StartedAt).TotalMinutes);

        // Average speed in km/h
        var activitiesWithSpeed = activities.Where(a => a.AverageSpeedKmh.HasValue).ToList();
        var averageSpeedKmh = activitiesWithSpeed.Any() 
            ? activitiesWithSpeed.Average(a => a.AverageSpeedKmh!.Value) 
            : 0;

        // Total elevation (we don't have this field yet, so it's 0 for now)
        var totalElevationMeters = 0.0;

        // Current month km
        var firstDayOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var currentMonthKm = activities
            .Where(a => a.StartedAt >= firstDayOfMonth)
            .Sum(a => a.TotalDistanceMeters) / 1000.0;

        // Current week km (Monday to Sunday)
        var today = DateTime.UtcNow.Date;
        var dayOfWeek = (int)today.DayOfWeek;
        var daysToSubtract = dayOfWeek == 0 ? 6 : dayOfWeek - 1; // Monday as start of week
        var firstDayOfWeek = today.AddDays(-daysToSubtract);
        var currentWeekKm = activities
            .Where(a => a.StartedAt >= firstDayOfWeek)
            .Sum(a => a.TotalDistanceMeters) / 1000.0;

        // Longest tour km
        var longestTourKm = activities.Any() 
            ? activities.Max(a => a.TotalDistanceMeters) / 1000.0 
            : 0;

        return new DashboardStatsDto(
            totalDistanceKm,
            totalActivities,
            totalDurationMinutes,
            averageSpeedKmh,
            totalElevationMeters,
            currentMonthKm,
            currentWeekKm,
            longestTourKm
        );
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetStats()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var finishedActivities = await _context.Activities
            .Where(a => a.UserId == userId && a.Status == ActivityStatus.Finished)
            .ToListAsync();

        var stats = CalculateStats(finishedActivities);

        return Ok(stats);
    }
}
