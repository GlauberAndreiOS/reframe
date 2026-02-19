using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TherapyPackageController(ApplicationDbContext context) : ControllerBase
{
    private Guid GetUserId() => Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());

    [HttpPost]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<TherapyPackageDto>> Create(CreateTherapyPackageDto dto)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var patient = await context.Patients.FirstOrDefaultAsync(p => p.Id == dto.PatientId);
        if (patient == null) return NotFound("Patient not found.");
        if (patient.PsychologistId != psychologist.Id) return BadRequest("Patient does not belong to this psychologist.");

        var package = new TherapyPackage
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            TotalSessions = dto.TotalSessions,
            UsedSessions = 0,
            BillingCycle = dto.BillingCycle,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = dto.Status,
            RolloverPolicy = dto.RolloverPolicy,
            PausePolicy = dto.PausePolicy,
            SessionConsumptionPolicy = dto.SessionConsumptionPolicy
        };

        context.TherapyPackages.Add(package);
        await context.SaveChangesAsync();

        return Ok(MapToDto(package));
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<ActionResult<IEnumerable<TherapyPackageDto>>> GetPatientPackages(Guid patientId)
    {
        var userId = GetUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (role == "Patient")
        {
            var currentPatient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
            if (currentPatient == null || currentPatient.Id != patientId) return Forbid();
        }
        else if (role == "Psychologist")
        {
            var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
            if (psychologist == null) return BadRequest("Psychologist profile not found.");

            var patient = await context.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null) return NotFound("Patient not found.");
            if (patient.PsychologistId != psychologist.Id) return Forbid();
        }
        else
        {
            return Forbid();
        }

        var packages = await context.TherapyPackages
            .Where(tp => tp.PatientId == patientId)
            .OrderByDescending(tp => tp.StartDate)
            .ToListAsync();

        return Ok(packages.Select(MapToDto));
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<TherapyPackageDto>> UpdateStatus(Guid id, UpdateTherapyPackageStatusDto dto)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var package = await context.TherapyPackages
            .Include(tp => tp.Patient)
            .FirstOrDefaultAsync(tp => tp.Id == id);
        if (package == null) return NotFound("Package not found.");
        if (package.Patient?.PsychologistId != psychologist.Id) return Forbid();

        package.Status = dto.Status;
        await context.SaveChangesAsync();

        return Ok(MapToDto(package));
    }

    [HttpPost("holidays")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<HolidayDto>> CreateHoliday(CreateHolidayDto dto)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var date = dto.Date.Date;
        var existing = await context.Holidays.FirstOrDefaultAsync(h => h.PsychologistId == psychologist.Id && h.Date == date);
        if (existing != null) return BadRequest("Holiday already exists for this date.");

        var holiday = new Holiday
        {
            Id = Guid.NewGuid(),
            PsychologistId = psychologist.Id,
            Date = date,
            Description = dto.Description
        };

        context.Holidays.Add(holiday);
        await context.SaveChangesAsync();

        return Ok(new HolidayDto { Id = holiday.Id, Date = holiday.Date, Description = holiday.Description });
    }

    [HttpGet("holidays")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<HolidayDto>>> GetHolidays([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var holidays = await context.Holidays
            .Where(h => h.PsychologistId == psychologist.Id && h.Date >= startDate.Date && h.Date <= endDate.Date)
            .OrderBy(h => h.Date)
            .ToListAsync();

        return Ok(holidays.Select(h => new HolidayDto
        {
            Id = h.Id,
            Date = h.Date,
            Description = h.Description
        }));
    }

    private static TherapyPackageDto MapToDto(TherapyPackage tp)
    {
        return new TherapyPackageDto
        {
            Id = tp.Id,
            PatientId = tp.PatientId,
            TotalSessions = tp.TotalSessions,
            UsedSessions = tp.UsedSessions,
            BillingCycle = tp.BillingCycle,
            StartDate = tp.StartDate,
            EndDate = tp.EndDate,
            Status = tp.Status,
            RolloverPolicy = tp.RolloverPolicy,
            PausePolicy = tp.PausePolicy,
            SessionConsumptionPolicy = tp.SessionConsumptionPolicy
        };
    }
}
