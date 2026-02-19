using reframe.Models;

namespace reframe.Services;

public interface INotificationDispatcher
{
    Task DispatchAsync(NotificationTemplate template, Guid? appointmentId, IEnumerable<NotificationChannel>? channels = null);
}
