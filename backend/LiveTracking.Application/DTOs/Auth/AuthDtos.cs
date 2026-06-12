namespace LiveTracking.Application.DTOs.Auth;

public record RegisterRequest(
    string Email,
    string Password,
    string? DisplayName
);

public record LoginRequest(
    string Email,
    string Password
);

public record RefreshTokenRequest(
    string RefreshToken
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    Guid UserId,
    string Email,
    string? DisplayName
);
