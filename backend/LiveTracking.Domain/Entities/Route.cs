namespace LiveTracking.Domain.Entities;

public class Route : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public double TotalDistanceMeters { get; set; }
    public double? MinElevationMeters { get; set; }
    public double? MaxElevationMeters { get; set; }
    public double? TotalAscentMeters { get; set; }
    public double? TotalDescentMeters { get; set; }
    
    // Navigation properties
    public ICollection<RoutePoint> RoutePoints { get; set; } = new List<RoutePoint>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}
