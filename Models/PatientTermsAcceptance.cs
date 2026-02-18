using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class PatientTermsAcceptance
{
    [Key] public Guid Id { get; set; }

    public Guid PatientId { get; set; }

    [ForeignKey("PatientId")] [JsonIgnore] public Patient? Patient { get; set; }

    public Guid TherapistId { get; set; }

    [ForeignKey("TherapistId")] [JsonIgnore] public Psychologist? Therapist { get; set; }

    public int TermsVersion { get; set; }

    public DateTime AcceptedAt { get; set; }

    public Guid AppointmentId { get; set; }

    [ForeignKey("AppointmentId")] [JsonIgnore] public Appointment? Appointment { get; set; }

    public string? Ip { get; set; }

    public string? Device { get; set; }
}
