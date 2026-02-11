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

        patient.PsychologistId = psychologistId;
        await context.SaveChangesAsync();

        return Ok("Successfully linked to psychologist.");
    }


    [HttpPut("psychologist")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UpdatePsychologistLink([FromBody] UpdatePsychologistDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        if (dto.PsychologistId.HasValue)
        {
            var psychologist = await context.Psychologists.FindAsync(dto.PsychologistId.Value);
            if (psychologist == null) return NotFound("Psychologist not found.");
        }

        patient.PsychologistId = dto.PsychologistId;
        await context.SaveChangesAsync();

        return Ok("Psychologist link updated successfully.");
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
            Psychologist = patient.Psychologist != null
                ? new
                {
                    patient.Psychologist.Id,
                    Name = patient.Psychologist.User?.Name ?? string.Empty,
                    patient.Psychologist.CRP,
                    ProfilePictureUrl = patient.Psychologist.User?.ProfilePictureUrl
                }
                : null
        });
    }
}
