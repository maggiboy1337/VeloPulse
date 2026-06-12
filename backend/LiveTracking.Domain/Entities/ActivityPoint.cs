namespace LiveTracking.Domain.Entities;

public class ActivityPoint : BaseEntity
{
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
    
    public DateTime Timestamp { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? ElevationMeters { get; set; }
    public double? SpeedKmh { get; set; }
    public double? AccuracyMeters { get; set; }
    public int? HeartRateBpm { get; set; }
    public int? CadenceRpm { get; set; }
    public int? PowerWatts { get; set; }
    public double DistanceFromStartMeters { get; set; }
}
