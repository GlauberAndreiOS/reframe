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
    }
}