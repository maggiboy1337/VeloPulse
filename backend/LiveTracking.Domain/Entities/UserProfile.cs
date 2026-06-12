namespace LiveTracking.Domain.Entities;

public class UserProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string? DisplayName { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? Bio { get; set; }
    public string? Location { get; set; }
    
    // Privacy settings
    public bool ShareHeartRate { get; set; } = true;
    public bool ShareSpeed { get; set; } = true;
    public bool ShareDistance { get; set; } = true;
}
