namespace LiveTracking.Domain.Entities;

public class LiveSnapshot : BaseEntity
{
    public Guid LiveSessionId { get; set; }
    public LiveSession LiveSession { get; set; } = null!;
    
    public string PublicSessionId { get; set; } = null!;
    public DateTime TimestampUtc { get; set; }
    
    // Location data
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? GpsAccuracyMeters { get; set; }
    
    // Speed & distance
    public double? SpeedKmh { get; set; }
    public double DistanceCompletedMeters { get; set; }
    public double? DistanceRemainingMeters { get; set; }
    public double? RouteProgressPercent { get; set; }
    
    // Sensor data (nullable - might not be available)
    public int? HeartRateBpm { get; set; }
    public int? CadenceRpm { get; set; }
    public int? PowerWatts { get; set; }
}
