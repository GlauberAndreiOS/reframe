using reframe.Data;
using reframe.Models;

namespace reframe.Services;

public interface IAuditService
{
    Task LogAsync(Guid? actorUserId, string actionType, string entityType, string? entityId, string? details, string? ipAddress);
}

public class AuditService(ApplicationDbContext context) : IAuditService
{
    public async Task LogAsync(Guid? actorUserId, string actionType, string entityType, string? entityId, string? details, string? ipAddress)
    {
        context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = actorUserId,
            ActionType = actionType,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            IpAddress = ipAddress,
            OccurredAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }
}
