namespace LiveTracking.Application.DTOs.Activities;

public record ActivityDto(
    Guid Id,
    string? Name,
    string Status,
    DateTime StartedAt,
    DateTime? FinishedAt,
    double TotalDistanceMeters,
    double? AverageSpeedKmh,
    Guid? RouteId,
    string? RouteName
);

public record StartActivityRequest(
    Guid? RouteId,
    string? Name
);

public record ActivityPointRequest(
    DateTime Timestamp,
    double Latitude,
    double Longitude,
    double? ElevationMeters,
    double? SpeedKmh,
    double? AccuracyMeters,
    int? HeartRateBpm,
    int? CadenceRpm,
    int? PowerWatts
);
