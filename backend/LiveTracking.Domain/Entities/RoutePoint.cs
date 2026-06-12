namespace LiveTracking.Domain.Entities;

public class RoutePoint : BaseEntity
{
    public Guid RouteId { get; set; }
    public Route Route { get; set; } = null!;
    
    public int SequenceNumber { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? ElevationMeters { get; set; }
    public double DistanceFromStartMeters { get; set; }
}
