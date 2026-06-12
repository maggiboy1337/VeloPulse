using Microsoft.AspNetCore.SignalR;

namespace LiveTracking.Api.Hubs;

public class LiveTrackingHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }

    // Methods to be called by clients (if needed)
    public async Task JoinSession(string publicSessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, publicSessionId);
    }

    public async Task LeaveSession(string publicSessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, publicSessionId);
    }
}

public static class LiveTrackingHubExtensions
{
    public static async Task SendLiveSessionStarted(
        this IHubContext<LiveTrackingHub> hubContext,
        string publicSessionId,
        object sessionData)
    {
        await hubContext.Clients.All.SendAsync("LiveSessionStarted", publicSessionId, sessionData);
    }

    public static async Task SendLiveSessionUpdated(
        this IHubContext<LiveTrackingHub> hubContext,
        string publicSessionId,
        object snapshotData)
    {
        await hubContext.Clients.All.SendAsync("LiveSessionUpdated", publicSessionId, snapshotData);
    }

    public static async Task SendLiveSessionEnded(
        this IHubContext<LiveTrackingHub> hubContext,
        string publicSessionId)
    {
        await hubContext.Clients.All.SendAsync("LiveSessionEnded", publicSessionId);
    }
}
