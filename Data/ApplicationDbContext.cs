using Microsoft.EntityFrameworkCore;
using reframe.Models;

namespace reframe.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<Psychologist> Psychologists { get; set; }
    public DbSet<Patient> Patients { get; set; }
    public DbSet<AutomaticThought> AutomaticThoughts { get; set; }
    public DbSet<Questionnaire> Questionnaires { get; set; }
    public DbSet<QuestionnaireTemplate> QuestionnaireTemplates { get; set; }
    public DbSet<QuestionnaireResponse> QuestionnaireResponses { get; set; }
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<TherapistPayoutAccount> TherapistPayoutAccounts { get; set; }
    public DbSet<TherapistPayoutPolicy> TherapistPayoutPolicies { get; set; }
    public DbSet<TherapistLedgerTransaction> TherapistLedgerTransactions { get; set; }
    public DbSet<TherapistTerms> TherapistTerms { get; set; }
    public DbSet<PatientTermsAcceptance> PatientTermsAcceptances { get; set; }
    public DbSet<FinancialLedgerEvent> FinancialLedgerEvents { get; set; }
    public DbSet<FinancialLedgerCurrentBalance> FinancialLedgerCurrentBalances { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<Psychologist>()
            .HasIndex(p => p.CRP)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasOne(u => u.PsychologistProfile)
            .WithOne(p => p.User)
            .HasForeignKey<Psychologist>(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasOne(u => u.PatientProfile)
            .WithOne(p => p.User)
            .HasForeignKey<Patient>(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Patient>()
            .HasOne(p => p.Psychologist)
            .WithMany(psy => psy.Patients)
            .HasForeignKey(p => p.PsychologistId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Patient>()
            .HasOne(p => p.PendingPsychologist)
            .WithMany()
            .HasForeignKey(p => p.PendingPsychologistId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AutomaticThought>()
            .HasOne(at => at.Patient)
            .WithMany(p => p.AutomaticThoughts)
            .HasForeignKey(at => at.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Questionnaire>()
            .HasOne(q => q.Psychologist)
            .WithMany()
            .HasForeignKey(q => q.PsychologistId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Questionnaire>()
            .HasOne(q => q.TargetPatient)
            .WithMany()
            .HasForeignKey(q => q.TargetPatientId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Questionnaire>()
            .Property(q => q.Questions)
            .HasColumnType("jsonb");
            
        modelBuilder.Entity<QuestionnaireTemplate>()
            .Property(qt => qt.Questions)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Patient>()
            .Property(p => p.Documents)
            .HasColumnType("jsonb");

        modelBuilder.Entity<QuestionnaireResponse>()
            .HasOne(qr => qr.Questionnaire)
            .WithMany()
            .HasForeignKey(qr => qr.QuestionnaireId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestionnaireResponse>()
            .HasOne(qr => qr.Patient)
            .WithMany()
            .HasForeignKey(qr => qr.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestionnaireResponse>()
            .Property(qr => qr.Answers)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Psychologist)
            .WithMany()
            .HasForeignKey(a => a.PsychologistId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Patient)
            .WithMany()
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TherapistPayoutAccount>()
            .HasIndex(a => a.PsychologistId)
            .IsUnique();

        modelBuilder.Entity<TherapistPayoutAccount>()
            .HasOne(a => a.Psychologist)
            .WithMany()
            .HasForeignKey(a => a.PsychologistId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TherapistPayoutPolicy>()
            .HasIndex(p => p.PsychologistId)
            .IsUnique();

        modelBuilder.Entity<TherapistPayoutPolicy>()
            .HasOne(p => p.Psychologist)
            .WithMany()
            .HasForeignKey(p => p.PsychologistId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TherapistLedgerTransaction>()
            .HasIndex(t => t.PsychologistId);

        modelBuilder.Entity<TherapistLedgerTransaction>()
            .HasIndex(t => t.MercadoPagoTransactionId)
            .IsUnique();

        modelBuilder.Entity<TherapistLedgerTransaction>()
            .HasOne(t => t.Psychologist)
            .WithMany()
            .HasForeignKey(t => t.PsychologistId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<TherapistTerms>()
            .HasOne(t => t.Therapist)
            .WithMany()
            .HasForeignKey(t => t.TherapistId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TherapistTerms>()
            .HasIndex(t => new { t.TherapistId, t.Version })
            .IsUnique();

        modelBuilder.Entity<PatientTermsAcceptance>()
            .HasOne(a => a.Patient)
            .WithMany()
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientTermsAcceptance>()
            .HasOne(a => a.Therapist)
            .WithMany()
            .HasForeignKey(a => a.TherapistId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientTermsAcceptance>()
            .HasOne(a => a.Appointment)
            .WithMany()
            .HasForeignKey(a => a.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientTermsAcceptance>()
            .HasIndex(a => new { a.PatientId, a.TherapistId, a.TermsVersion });
        var financialLedgerBuilder = modelBuilder.Entity<FinancialLedgerEvent>();

        financialLedgerBuilder
            .ToTable("financial_ledger");

        financialLedgerBuilder
            .Property(f => f.Id)
            .HasColumnName("id");

        financialLedgerBuilder
            .Property(f => f.PatientId)
            .HasColumnName("patient_id");

        financialLedgerBuilder
            .Property(f => f.TherapistId)
            .HasColumnName("therapist_id");

        financialLedgerBuilder
            .Property(f => f.AppointmentId)
            .HasColumnName("appointment_id");

        financialLedgerBuilder
            .Property(f => f.PackageId)
            .HasColumnName("package_id");

        financialLedgerBuilder
            .Property(f => f.AmountCents)
            .HasColumnName("amount_cents");

        financialLedgerBuilder
            .Property(f => f.Currency)
            .HasColumnName("currency")
            .HasMaxLength(3);

        financialLedgerBuilder
            .Property(f => f.Direction)
            .HasColumnName("direction")
            .HasConversion<string>();

        financialLedgerBuilder
            .Property(f => f.EventType)
            .HasColumnName("event_type")
            .HasConversion<string>();

        financialLedgerBuilder
            .Property(f => f.OccurredAt)
            .HasColumnName("occurred_at");

        financialLedgerBuilder
            .Property(f => f.MetadataJson)
            .HasColumnName("metadata_json")
            .HasColumnType("jsonb");

        financialLedgerBuilder
            .Property(f => f.IdempotencyKey)
            .HasColumnName("idempotency_key")
            .HasMaxLength(128);

        financialLedgerBuilder
            .Property(f => f.Source)
            .HasColumnName("source")
            .HasConversion<string>();

        financialLedgerBuilder
            .HasIndex(f => f.IdempotencyKey)
            .IsUnique();

        financialLedgerBuilder
            .HasIndex(f => new { f.PatientId, f.TherapistId, f.OccurredAt });

        financialLedgerBuilder
            .HasOne(f => f.Patient)
            .WithMany()
            .HasForeignKey(f => f.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        financialLedgerBuilder
            .HasOne(f => f.Therapist)
            .WithMany()
            .HasForeignKey(f => f.TherapistId)
            .OnDelete(DeleteBehavior.Restrict);

        financialLedgerBuilder
            .HasOne(f => f.Appointment)
            .WithMany()
            .HasForeignKey(f => f.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<FinancialLedgerCurrentBalance>()
            .HasNoKey()
            .ToView("financial_ledger_current_balance");
    }
}
