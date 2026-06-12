using Microsoft.AspNetCore.Identity;

namespace LiveTracking.Domain.Entities;

public class User : IdentityUser<Guid>
{
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public UserProfile? Profile { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<SensorDevice> SensorDevices { get; set; } = new List<SensorDevice>();
    public ICollection<Route> Routes { get; set; } = new List<Route>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<LiveSession> LiveSessions { get; set; } = new List<LiveSession>();
}
