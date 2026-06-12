namespace LiveTracking.Domain.Entities;

public class LiveSession : BaseEntity
{
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
    
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    // Public identifier (never expose internal database IDs)
    public string PublicSessionId { get; set; } = null!;
    
    public bool IsPublic { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    
    // Navigation properties
    public ICollection<LiveSnapshot> Snapshots { get; set; } = new List<LiveSnapshot>();
}
