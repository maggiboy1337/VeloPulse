namespace LiveTracking.Application.DTOs.Live;

public record LiveSessionDto(
    Guid Id,
    string PublicSessionId,
    bool IsPublic,
    DateTime StartedAt,
    DateTime? EndedAt,
    Guid ActivityId
);

public record StartLiveSessionRequest(
    Guid ActivityId,
    bool IsPublic
);

public record UpdateVisibilityRequest(
    bool IsPublic
);

public record LiveSnapshotRequest(
    double Latitude,
    double Longitude,
    double? GpsAccuracyMeters,
    double? SpeedKmh,
    double DistanceCompletedMeters,
    double? DistanceRemainingMeters,
    double? RouteProgressPercent,
    int? HeartRateBpm,
    int? CadenceRpm,
    int? PowerWatts
);

public record PublicLiveSessionDto(
    string PublicSessionId,
    string DisplayName,
    string? ProfileImageUrl,
    DateTime StartedAt,
    PublicLiveSnapshotDto? CurrentSnapshot,
    List<RoutePointDto>? RoutePoints,
    List<ActivityPointDto>? ActivityPoints  // Actual GPS track
);

public record ActivityPointDto(
    double Latitude,
    double Longitude,
    DateTime Timestamp
);

public record PublicLiveSnapshotDto(
    DateTime TimestampUtc,
    double Latitude,
    double Longitude,
    double? GpsAccuracyMeters,
    double? SpeedKmh,
    double DistanceCompletedMeters,
    double? DistanceRemainingMeters,
    double? RouteProgressPercent,
    int? HeartRateBpm
);

public record RoutePointDto(
    double Latitude,
    double Longitude,
    double? ElevationMeters
);
