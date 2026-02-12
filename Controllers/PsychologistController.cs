using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PsychologistController(ApplicationDbContext context) : ControllerBase
{
    private static DateTime? NormalizeToUtc(DateTime? value)
    {
        if (!value.HasValue) return null;
        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        };
    }

    private static bool IsValidCpf(string? cpf)
    {
        if (string.IsNullOrWhiteSpace(cpf))
            return true;

        var digits = new string(cpf.Where(char.IsDigit).ToArray());
        return digits.Length == 11;
    }

    private static bool IsValidZipCode(string? zipCode)
    {
        if (string.IsNullOrWhiteSpace(zipCode))
            return true;

        var digits = new string(zipCode.Where(char.IsDigit).ToArray());
        return digits.Length == 8;
    }

    [HttpGet("profile")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null) return NotFound("Psychologist profile not found.");

        return Ok(new
        {
            psychologist.Id,
            Name = psychologist.User?.Name ?? string.Empty,
            psychologist.CRP,
            Email = psychologist.User?.Username ?? string.Empty,
            ProfilePictureUrl = psychologist.User?.ProfilePictureUrl,
            psychologist.User?.BirthDate,
            psychologist.User?.Street,
            psychologist.User?.AddressNumber,
            psychologist.User?.AddressComplement,
            psychologist.User?.Neighborhood,
            psychologist.User?.City,
            psychologist.User?.State,
            psychologist.User?.ZipCode,
            psychologist.User?.Cpf,
            psychologist.User?.BiologicalSex,
            psychologist.SessionDurationMinutes,
            psychologist.BusinessPhone,
            psychologist.Specialty,
            psychologist.PresentationText
        });
    }

    [HttpPut("profile")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdatePsychologistProfileDto dto)
    {
        if (!IsValidCpf(dto.Cpf)) return BadRequest("CPF must contain 11 digits.");
        if (!IsValidZipCode(dto.ZipCode)) return BadRequest("ZipCode must contain 8 digits.");
        if (dto.SessionDurationMinutes.HasValue && dto.SessionDurationMinutes.Value <= 0)
            return BadRequest("Session duration must be greater than zero.");

        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null || psychologist.User == null) return NotFound("Psychologist profile not found.");

        psychologist.User.Name = dto.Name ?? psychologist.User.Name;
        psychologist.User.BirthDate = NormalizeToUtc(dto.BirthDate);
        psychologist.User.Street = dto.Street;
        psychologist.User.AddressNumber = dto.AddressNumber;
        psychologist.User.AddressComplement = dto.AddressComplement;
        psychologist.User.Neighborhood = dto.Neighborhood;
        psychologist.User.City = dto.City;
        psychologist.User.State = dto.State;
        psychologist.User.ZipCode = string.IsNullOrWhiteSpace(dto.ZipCode) ? null : new string(dto.ZipCode.Where(char.IsDigit).ToArray());
        psychologist.User.Cpf = string.IsNullOrWhiteSpace(dto.Cpf) ? null : new string(dto.Cpf.Where(char.IsDigit).ToArray());
        psychologist.User.BiologicalSex = dto.BiologicalSex;

        psychologist.SessionDurationMinutes = dto.SessionDurationMinutes;
        psychologist.BusinessPhone = dto.BusinessPhone;
        psychologist.Specialty = dto.Specialty;
        psychologist.PresentationText = dto.PresentationText;

        await context.SaveChangesAsync();
        return Ok("Profile updated successfully.");
    }


    [HttpGet("patients")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyPatients()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patients = await context.Patients
            .Include(p => p.User)
            .Where(p => p.PsychologistId == psychologist.Id || p.PendingPsychologistId == psychologist.Id)
            .ToListAsync();

        var result = patients
            .Select(p => new
            {
                p.Id,
                Name = p.User?.Name ?? string.Empty,
                ProfilePictureUrl = p.User?.ProfilePictureUrl,
                LinkStatus = p.PendingPsychologistId == psychologist.Id ? "Pending" : "Linked"
            })
            .OrderByDescending(p => p.LinkStatus == "Pending")
            .ThenBy(p => p.Name);

        return Ok(result);
    }

    [HttpGet("patient/{patientId}/profile")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<object>> GetPatientProfile(Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patient = await context.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient == null) return NotFound("Patient not found.");

        var hasAccess = patient.PsychologistId == psychologist.Id || patient.PendingPsychologistId == psychologist.Id;
        if (!hasAccess) return Forbid("You do not have access to this patient's profile.");

        var documents = patient.Documents?.ToList() ?? [];

        return Ok(new
        {
            patient.Id,
            Name = patient.User?.Name ?? string.Empty,
            ProfilePictureUrl = patient.User?.ProfilePictureUrl,
            patient.User?.BirthDate,
            patient.User?.Street,
            patient.User?.AddressNumber,
            patient.User?.AddressComplement,
            patient.User?.Neighborhood,
            patient.User?.City,
            patient.User?.State,
            patient.User?.ZipCode,
            patient.User?.Cpf,
            patient.User?.BiologicalSex,
            Documents = documents
                .OrderByDescending(d => d.UploadedAtUtc)
                .ToList()
        });
    }

    [HttpGet("patient/{patientId}/documents")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<PatientDocument>>> GetPatientDocuments(Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patient = await context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient == null) return NotFound("Patient not found.");

        var hasAccess = patient.PsychologistId == psychologist.Id || patient.PendingPsychologistId == psychologist.Id;
        if (!hasAccess) return Forbid("You do not have access to this patient's documents.");

        return Ok((patient.Documents ?? [])
            .OrderByDescending(d => d.UploadedAtUtc)
            .ToList());
    }

    [HttpPut("patient/{patientId}/approve-link")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> ApprovePatientLinkRequest(Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patient = await context.Patients.FindAsync(patientId);
        if (patient == null) return NotFound("Patient not found.");

        if (patient.PendingPsychologistId != psychologist.Id)
            return BadRequest("This patient does not have a pending request for you.");

        patient.PsychologistId = psychologist.Id;
        patient.PendingPsychologistId = null;
        await context.SaveChangesAsync();

        return Ok("Patient link approved successfully.");
    }

    [HttpPut("patient/{patientId}/reject-link")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> RejectPatientLinkRequest(Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patient = await context.Patients.FindAsync(patientId);
        if (patient == null) return NotFound("Patient not found.");

        if (patient.PendingPsychologistId != psychologist.Id)
            return BadRequest("This patient does not have a pending request for you.");

        patient.PendingPsychologistId = null;
        await context.SaveChangesAsync();

        return Ok("Patient link request rejected successfully.");
    }


    [HttpGet("all")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetAllPsychologists()
    {
        var result = await context.Psychologists
            .Include(p => p.User)
            .Select(p => new
            {
                p.Id,
                Name = p.User != null ? p.User.Name : string.Empty,
                p.CRP,
                Email = p.User != null ? p.User.Username : string.Empty
            })
            .ToListAsync();

        return Ok(result);
    }


    [HttpPut("patient/{patientId}/unlink")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> UnlinkPatient(Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patient = await context.Patients.FindAsync(patientId);
        if (patient == null) return NotFound("Patient not found.");

        if (patient.PsychologistId != psychologist.Id) return BadRequest("This patient is not linked to you.");

        patient.PsychologistId = null;
        await context.SaveChangesAsync();

        return Ok("Patient unlinked successfully.");
    }


    [HttpPut("patient/{patientId}/transfer/{targetPsychologistId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> TransferPatient(Guid patientId, Guid targetPsychologistId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var currentPsychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (currentPsychologist == null) return NotFound("Current psychologist profile not found.");

        var patient = await context.Patients.FindAsync(patientId);
        if (patient == null) return NotFound("Patient not found.");

        if (patient.PsychologistId != currentPsychologist.Id) return BadRequest("This patient is not linked to you.");

        var targetPsychologist = await context.Psychologists.FindAsync(targetPsychologistId);
        if (targetPsychologist == null) return NotFound("Target psychologist not found.");

        patient.PsychologistId = targetPsychologistId;
        await context.SaveChangesAsync();

        return Ok("Patient transferred successfully.");
    }


    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> SearchPsychologists([FromQuery] string? name,
        [FromQuery] string? crp)
    {
        var query = context.Psychologists.Include(p => p.User).AsQueryable();

        if (!string.IsNullOrEmpty(name)) query = query.Where(p => p.User != null && p.User.Name.Contains(name));

        if (!string.IsNullOrEmpty(crp)) query = query.Where(p => p.CRP.Contains(crp));

        var result = await query.Select(p => new
        {
            p.Id,
            Name = p.User != null ? p.User.Name : string.Empty,
            p.CRP,
            Email = p.User != null ? p.User.Username : string.Empty
        }).ToListAsync();

        return Ok(result);
    }


}
