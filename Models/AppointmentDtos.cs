using reframe.Models;

namespace reframe.Models;

public class AppointmentDto
{
    public Guid Id { get; set; }
    public Guid PsychologistId { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public AppointmentStatus Status { get; set; }
    public string? Reason { get; set; }
    public Guid? TherapyPackageId { get; set; }
    public bool IsExtraSession { get; set; }
    public bool SessionConsumed { get; set; }
}

public class CreateSlotsDto
{
    public DateTime Date { get; set; }
    public List<string> Times { get; set; } = new(); // ["09:00", "10:00"]
    public int DurationMinutes { get; set; } = 50;
    public int OffsetMinutes { get; set; }
}

public class BookAppointmentDto
{
    public Guid SlotId { get; set; }
    public string? Reason { get; set; }
    public Guid? TherapyPackageId { get; set; }
    public bool IsExtraSession { get; set; }
}

public class PrebookRecurringAppointmentsDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<DayOfWeek> Weekdays { get; set; } = new();
    public string Time { get; set; } = "09:00";
    public int DurationMinutes { get; set; } = 50;
    public int OffsetMinutes { get; set; }
    public Guid? TherapyPackageId { get; set; }
    public bool IsExtraSession { get; set; }
    public string? Reason { get; set; }
}

public class PrebookRecurringResultDto
{
    public List<AppointmentDto> ReservedAppointments { get; set; } = new();
    public List<string> SkippedDates { get; set; } = new();
}

public class UpdateAppointmentStatusDto
{
    public AppointmentStatus Status { get; set; }
    public DateTime? NewStart { get; set; }
    public DateTime? NewEnd { get; set; }
}

public class AssignPatientDto
{
    public Guid PatientId { get; set; }
}

public class RescheduleAppointmentDto
{
    public DateTime NewStart { get; set; }
    public DateTime NewEnd { get; set; }
    public bool CreateIfMissing { get; set; } = false;
}

public class PatientDayStatusDto
{
    public string DateKey { get; set; } = string.Empty; // yyyy-MM-dd (local day)
    public AppointmentStatus Status { get; set; }
}

public class PatientRescheduleDto
{
    public Guid TargetSlotId { get; set; }
}
