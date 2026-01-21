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

        // Garante que o Username seja único
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Garante que o CRP do Psicólogo seja único
        modelBuilder.Entity<Psychologist>()
            .HasIndex(p => p.CRP)
            .IsUnique();

        // Configuração de relacionamento 1:1 entre User e Psychologist
        modelBuilder.Entity<User>()
            .HasOne(u => u.PsychologistProfile)
            .WithOne(p => p.User)
            .HasForeignKey<Psychologist>(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict); // Alterado para Restrict para evitar ciclos no SQL Server

        // Configuração de relacionamento 1:1 entre User e Patient
        modelBuilder.Entity<User>()
            .HasOne(u => u.PatientProfile)
            .WithOne(p => p.User)
            .HasForeignKey<Patient>(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict); // Alterado para Restrict para evitar ciclos no SQL Server

        // Configuração de relacionamento 1:N entre Psychologist e Patient
        modelBuilder.Entity<Patient>()
            .HasOne(p => p.Psychologist)
            .WithMany(psy => psy.Patients)
            .HasForeignKey(p => p.PsychologistId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configuração de relacionamento 1:N entre Patient e AutomaticThought
        modelBuilder.Entity<AutomaticThought>()
            .HasOne(at => at.Patient)
            .WithMany(p => p.AutomaticThoughts)
            .HasForeignKey(at => at.PatientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}