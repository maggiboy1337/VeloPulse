namespace LiveTracking.Domain.Entities;

public enum ActivityStatus
{
    Active,
    Paused,
    Finished
}

public class Activity : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public Guid? RouteId { get; set; }
    public Route? Route { get; set; }
    
    public string? Name { get; set; }
    public ActivityStatus Status { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? PausedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    
    public double TotalDistanceMeters { get; set; }
    public double? AverageSpeedKmh { get; set; }
    public double? MaxSpeedKmh { get; set; }
    public int? AverageHeartRateBpm { get; set; }
    public int? MaxHeartRateBpm { get; set; }
    
    // Navigation properties
    public ICollection<ActivityPoint> ActivityPoints { get; set; } = new List<ActivityPoint>();
    public LiveSession? LiveSession { get; set; }
}
