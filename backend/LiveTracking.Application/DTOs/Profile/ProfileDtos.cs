namespace LiveTracking.Application.DTOs.Profile;

public record UserProfileDto(
    Guid UserId,
    string Email,
    string? DisplayName,
    string? ProfileImageUrl,
    string? Bio,
    string? Location,
    bool ShareHeartRate,
    bool ShareSpeed,
    bool ShareDistance
);

public record UpdateProfileRequest(
    string? DisplayName,
    string? Bio,
    string? Location,
    bool ShareHeartRate,
    bool ShareSpeed,
    bool ShareDistance
);
