namespace LiveTracking.Application.DTOs.Routes;

public record RouteDto(
    Guid Id,
    string Name,
    string? Description,
    double TotalDistanceMeters,
    double? MinElevationMeters,
    double? MaxElevationMeters,
    double? TotalAscentMeters,
    double? TotalDescentMeters,
    DateTime CreatedAt
);

public record RouteDetailDto(
    Guid Id,
    string Name,
    string? Description,
    double TotalDistanceMeters,
    double? MinElevationMeters,
    double? MaxElevationMeters,
    double? TotalAscentMeters,
    double? TotalDescentMeters,
    DateTime CreatedAt,
    List<RoutePointDto> Points
);

public record RoutePointDto(
    int SequenceNumber,
    double Latitude,
    double Longitude,
    double? ElevationMeters,
    double DistanceFromStartMeters
);

public record ImportGpxRequest(
    string FileName,
    string GpxContent
);
