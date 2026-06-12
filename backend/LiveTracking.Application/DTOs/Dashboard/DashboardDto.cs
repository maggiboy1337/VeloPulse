namespace LiveTracking.Application.DTOs.Dashboard;

public record DashboardStatsDto(
    double TotalDistanceKm,
    int TotalActivities,
    int TotalDurationMinutes,
    double AverageSpeedKmh,
    double TotalElevationMeters,
    double CurrentMonthKm,
    double CurrentWeekKm,
    double LongestTourKm
);

public record RecentActivityDto(
    Guid Id,
    string Name,
    DateTime StartedAt,
    DateTime? FinishedAt,
    double DistanceKm,
    double? AverageSpeedKmh,
    int DurationMinutes,
    string Status
);

public record ActiveSessionDto(
    Guid Id,
    string PublicSessionId,
    Guid ActivityId,
    string ActivityName,
    DateTime StartedAt,
    double CurrentDistanceKm,
    int CurrentDurationMinutes,
    bool IsPublic
);

public record DashboardDto(
    DashboardStatsDto Stats,
    List<RecentActivityDto> RecentActivities,
    List<ActiveSessionDto> ActiveSessions
);
