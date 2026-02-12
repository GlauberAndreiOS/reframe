using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public enum UserType
{
    Psychologist,
    Patient
}

public class User
{
    [Key] public Guid Id { get; set; }

    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserType UserType { get; set; }

    public string Name { get; set; } = string.Empty;
    
    public string? ProfilePictureUrl { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Street { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressComplement { get; set; }
    public string? Neighborhood { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ZipCode { get; set; }
    public string? Cpf { get; set; }
    public BiologicalSex? BiologicalSex { get; set; }

    public string? ResetToken { get; set; }
    public DateTime? ResetTokenExpires { get; set; }

    public Psychologist? PsychologistProfile { get; set; }
    public Patient? PatientProfile { get; set; }
}
