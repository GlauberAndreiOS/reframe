using Microsoft.EntityFrameworkCore;
using reframe.Models;

namespace reframe.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Psychologist> Psychologists { get; set; }
    public DbSet<Patient> Patients { get; set; }
    public DbSet<AutomaticThought> AutomaticThoughts { get; set; }

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
            .OnDelete(DeleteBehavior.Restrict); // Alterado para Restrict para evitar ciclos no SQL Server

        modelBuilder.Entity<User>()
            .HasOne(u => u.PatientProfile)
            .WithOne(p => p.User)
            .HasForeignKey<Patient>(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict); // Alterado para Restrict para evitar ciclos no SQL Server

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
    }
}