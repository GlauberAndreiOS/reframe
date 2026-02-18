namespace reframe.Models;

public class FinancialLedgerCurrentBalance
{
    public Guid PatientId { get; set; }
    public Guid TherapistId { get; set; }
    public string Currency { get; set; } = "BRL";
    public long BalanceCents { get; set; }
    public DateTime LastOccurredAt { get; set; }
}
