using reframe.Data;
using reframe.Models;

namespace reframe.Services;

public class NotificationDispatcher(ApplicationDbContext context) : INotificationDispatcher
{
    private static readonly NotificationChannel[] DefaultChannels =
    [
        NotificationChannel.Email,
        NotificationChannel.Push
    ];

    public async Task DispatchAsync(NotificationTemplate template, Guid? appointmentId, IEnumerable<NotificationChannel>? channels = null)
    {
        var selectedChannels = channels?.ToArray() ?? DefaultChannels;
        var now = DateTime.UtcNow;

        foreach (var channel in selectedChannels)
        {
            context.NotificationLogs.Add(new NotificationLog
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointmentId,
                Template = template.ToString(),
                Channel = channel,
                SentAt = now,
                DeliveryStatus = NotificationDeliveryStatus.Sent
            });
        }

        await context.SaveChangesAsync();
    }
}
