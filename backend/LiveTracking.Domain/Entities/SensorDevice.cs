namespace LiveTracking.Domain.Entities;

public enum SensorType
{
    HeartRate,
    Speed,
    Cadence,
    Power
}

public enum ConnectionType
{
    BluetoothLE,
    AntPlus,
    Mock
}

public class SensorDevice : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string DeviceId { get; set; } = null!;
    public string? DeviceName { get; set; }
    public SensorType SensorType { get; set; }
    public ConnectionType ConnectionType { get; set; }
    
    public bool IsConnected { get; set; }
    public DateTime? LastConnectedAt { get; set; }
}
