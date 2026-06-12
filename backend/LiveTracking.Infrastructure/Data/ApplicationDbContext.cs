using LiveTracking.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LiveTracking.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<SensorDevice> SensorDevices => Set<SensorDevice>();
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<RoutePoint> RoutePoints => Set<RoutePoint>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<ActivityPoint> ActivityPoints => Set<ActivityPoint>();
    public DbSet<LiveSession> LiveSessions => Set<LiveSession>();
    public DbSet<LiveSnapshot> LiveSnapshots => Set<LiveSnapshot>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // User configuration
        builder.Entity<User>(entity =>
        {
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // UserProfile configuration
        builder.Entity<UserProfile>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
            
            entity.HasOne(e => e.User)
                .WithOne(u => u.Profile)
                .HasForeignKey<UserProfile>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // RefreshToken configuration
        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(e => e.Token);
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // SensorDevice configuration
        builder.Entity<SensorDevice>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.DeviceId });

            entity.HasOne(e => e.User)
                .WithMany(u => u.SensorDevices)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // Route configuration
        builder.Entity<Route>(entity =>
        {
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Routes)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // RoutePoint configuration
        builder.Entity<RoutePoint>(entity =>
        {
            entity.HasIndex(e => new { e.RouteId, e.SequenceNumber });

            entity.HasOne(e => e.Route)
                .WithMany(r => r.RoutePoints)
                .HasForeignKey(e => e.RouteId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // Activity configuration
        builder.Entity<Activity>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.RouteId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Activities)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Route)
                .WithMany(r => r.Activities)
                .HasForeignKey(e => e.RouteId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // ActivityPoint configuration
        builder.Entity<ActivityPoint>(entity =>
        {
            entity.HasIndex(e => e.ActivityId);
            entity.HasIndex(e => e.Timestamp);

            entity.HasOne(e => e.Activity)
                .WithMany(a => a.ActivityPoints)
                .HasForeignKey(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // LiveSession configuration
        builder.Entity<LiveSession>(entity =>
        {
            entity.HasIndex(e => e.PublicSessionId).IsUnique();
            entity.HasIndex(e => e.ActivityId).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.IsPublic);

            entity.HasOne(e => e.Activity)
                .WithOne(a => a.LiveSession)
                .HasForeignKey<LiveSession>(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.LiveSessions)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // LiveSnapshot configuration
        builder.Entity<LiveSnapshot>(entity =>
        {
            entity.HasIndex(e => e.LiveSessionId);
            entity.HasIndex(e => e.PublicSessionId);
            entity.HasIndex(e => e.TimestampUtc);

            entity.HasOne(e => e.LiveSession)
                .WithMany(ls => ls.Snapshots)
                .HasForeignKey(e => e.LiveSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker
            .Entries()
            .Where(e => e.Entity is BaseEntity && (e.State == EntityState.Modified));

        foreach (var entityEntry in entries)
        {
            ((BaseEntity)entityEntry.Entity).UpdatedAt = DateTime.UtcNow;
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
