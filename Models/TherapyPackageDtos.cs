namespace reframe.Models;

public class TherapyPackageDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int TotalSessions { get; set; }
    public int UsedSessions { get; set; }
    public BillingCycle BillingCycle { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public TherapyPackageStatus Status { get; set; }
    public RolloverPolicy RolloverPolicy { get; set; }
    public PausePolicy PausePolicy { get; set; }
    public SessionConsumptionPolicy SessionConsumptionPolicy { get; set; }
}

public class CreateTherapyPackageDto
{
    public Guid PatientId { get; set; }
    public int TotalSessions { get; set; }
    public BillingCycle BillingCycle { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public TherapyPackageStatus Status { get; set; } = TherapyPackageStatus.Active;
    public RolloverPolicy RolloverPolicy { get; set; } = RolloverPolicy.NoRollover;
    public PausePolicy PausePolicy { get; set; } = PausePolicy.NoPause;
    public SessionConsumptionPolicy SessionConsumptionPolicy { get; set; } = SessionConsumptionPolicy.OnAttendanceConfirmation;
}

public class UpdateTherapyPackageStatusDto
{
    public TherapyPackageStatus Status { get; set; }
}

public class HolidayDto
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }
}

public class CreateHolidayDto
{
    public DateTime Date { get; set; }
    public string? Description { get; set; }
}
