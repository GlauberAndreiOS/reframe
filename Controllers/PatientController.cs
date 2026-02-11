using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PatientController(ApplicationDbContext context, ILogger<PatientController> logger)
    : ControllerBase
{
    [HttpPost("link/{psychologistId}")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> LinkToPsychologist(Guid psychologistId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        var psychologist = await context.Psychologists.FindAsync(psychologistId);
        if (psychologist == null) return NotFound("Psychologist not found.");

        patient.PendingPsychologistId = psychologistId;
        await context.SaveChangesAsync();

        return Ok("Link request sent successfully.");
    }


    [HttpPut("psychologist")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UpdatePsychologistLink([FromBody] UpdatePsychologistDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        if (!dto.PsychologistId.HasValue)
        {
            patient.PsychologistId = null;
            patient.PendingPsychologistId = null;
            await context.SaveChangesAsync();

            return Ok("Psychologist link removed.");
        }

        var psychologist = await context.Psychologists.FindAsync(dto.PsychologistId.Value);
        if (psychologist == null) return NotFound("Psychologist not found.");

        if (patient.PsychologistId == dto.PsychologistId.Value)
        {
            patient.PendingPsychologistId = null;
            await context.SaveChangesAsync();
            return Ok("Patient is already linked to this psychologist.");
        }

        patient.PendingPsychologistId = dto.PsychologistId;
        await context.SaveChangesAsync();

        return Ok("Link request sent successfully.");
    }


    [HttpGet("profile")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var userIdClaim = User.FindFirst("UserId")?.Value;
        logger.LogInformation($"DEBUG: GetProfile called. UserId claim: {userIdClaim}");

        var userId = Guid.Parse(userIdClaim ?? Guid.Empty.ToString());

        var patient = await context.Patients
            .Include(p => p.User)
            .Include(p => p.Psychologist)
            .ThenInclude(psy => psy!.User)
            .Include(p => p.PendingPsychologist)
            .ThenInclude(psy => psy!.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null)
        {
            logger.LogWarning($"DEBUG: Patient profile not found for UserId: {userId}");
            return NotFound();
        }

        logger.LogInformation($"DEBUG: Patient found: {patient.User?.Name}, PsychologistId: {patient.PsychologistId}");

        return Ok(new
        {
            patient.Id,
            Name = patient.User?.Name ?? string.Empty,
            ProfilePictureUrl = patient.User?.ProfilePictureUrl,
            HasPendingLinkRequest = patient.PendingPsychologistId != null,
            Psychologist = patient.Psychologist != null
                ? new
                {
                    patient.Psychologist.Id,
                    Name = patient.Psychologist.User?.Name ?? string.Empty,
                    patient.Psychologist.CRP,
                    ProfilePictureUrl = patient.Psychologist.User?.ProfilePictureUrl
                }
                : null,
            PendingPsychologist = patient.PendingPsychologist != null
                ? new
                {
                    patient.PendingPsychologist.Id,
                    Name = patient.PendingPsychologist.User?.Name ?? string.Empty,
                    patient.PendingPsychologist.CRP,
                    ProfilePictureUrl = patient.PendingPsychologist.User?.ProfilePictureUrl
                }
                : null
        });
    }
}
