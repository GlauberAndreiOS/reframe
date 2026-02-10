using System.Security.Claims;
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AppointmentController(ApplicationDbContext context) : ControllerBase
{
    private Guid GetUserId() => Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());

    [HttpGet("slots")]
    public async Task<ActionResult<IEnumerable<AppointmentDto>>> GetSlots([FromQuery] DateTime date, [FromQuery] int offsetMinutes)
    {
        var userId = GetUserId();
        var userRole = User.FindFirstValue(ClaimTypes.Role);
        
        var targetDay = date.Date; 
        
        var startUtc = targetDay.AddMinutes(offsetMinutes);
        var endUtc = startUtc.AddDays(1);

        var queryDate = startUtc;
        var nextDay = endUtc;

        if (userRole == "Psychologist")
        {
            var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
            if (psychologist == null) return BadRequest("Psychologist profile not found.");

            var appointments = await context.Appointments
                .Include(a => a.Patient)
                .ThenInclude(p => p.User)
                .Where(a => a.PsychologistId == psychologist.Id 
                            && a.Status != AppointmentStatus.Canceled
                            && a.Start >= queryDate 
                            && a.Start < nextDay)
                .OrderBy(a => a.Start)
                .ToListAsync();

            return Ok(appointments.Select(MapToDto));
        }
        else if (userRole == "Patient")
        {
            var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return BadRequest("Patient profile not found.");

            if (patient.PsychologistId == null) return BadRequest("You must link a psychologist to use this feature.");

            var appointments = await context.Appointments
                .Where(a => a.PsychologistId == patient.PsychologistId 
                            && a.Start >= queryDate 
                            && a.Start < nextDay)
                .OrderBy(a => a.Start)
                .ToListAsync();
            
            var visibleAppointments = appointments.Where(a => 
                a.Status == AppointmentStatus.Available || 
                (a.PatientId == patient.Id && a.Status != AppointmentStatus.Canceled)
            ).ToList();

            return Ok(visibleAppointments.Select(MapToDto));
        }

        return Forbid();
    }

    [HttpGet("patient-day-statuses")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<IEnumerable<PatientDayStatusDto>>> GetPatientDayStatuses(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int offsetMinutes)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");

        if (patient.PsychologistId == null) return Ok(new List<PatientDayStatusDto>());

        var startUtc = startDate.Date.AddMinutes(offsetMinutes);
        var endUtcExclusive = endDate.Date.AddDays(1).AddMinutes(offsetMinutes);

        var appointments = await context.Appointments
            .Where(a => a.PsychologistId == patient.PsychologistId
                        && a.PatientId == patient.Id
                        && a.Start >= startUtc
                        && a.Start < endUtcExclusive
                        && (a.Status == AppointmentStatus.Requested
                            || a.Status == AppointmentStatus.Confirmed
                            || a.Status == AppointmentStatus.Canceled))
            .ToListAsync();

        var result = appointments
            .GroupBy(a => a.Start.AddMinutes(-offsetMinutes).Date)
            .Select(group => new PatientDayStatusDto
            {
                DateKey = group.Key.ToString("yyyy-MM-dd"),
                Status = SelectHighestPriorityStatus(group.Select(a => a.Status))
            })
            .ToList();

        return Ok(result);
    }

    [HttpPost("generate-slots")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> GenerateSlots(CreateSlotsDto dto)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");
        
        var date = dto.Date.ToUniversalTime().Date;

        foreach (var timeStr in dto.Times)
        {
            if (TimeSpan.TryParse(timeStr, out var time))
            {
                var start = date.Add(time).AddMinutes(dto.OffsetMinutes);
                var end = start.AddMinutes(dto.DurationMinutes);

                var exists = await context.Appointments.AnyAsync(a => 
                    a.PsychologistId == psychologist.Id &&
                    a.Start < end && start < a.End);

                if (!exists)
                {
                    context.Appointments.Add(new Appointment
                    {
                        Id = Guid.NewGuid(),
                        PsychologistId = psychologist.Id,
                        Start = start,
                        End = end,
                        Status = AppointmentStatus.Available
                    });
                }
            }
        }

        await context.SaveChangesAsync();
        return Ok("Slots generated.");
    }

    [HttpPost("request")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> RequestAppointment(BookAppointmentDto dto)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");

        var slot = await context.Appointments.FindAsync(dto.SlotId);
        if (slot == null) return NotFound("Slot not found.");

        if (slot.PsychologistId != patient.PsychologistId) return BadRequest("This slot does not belong to your psychologist.");
        if (slot.Status != AppointmentStatus.Available) return BadRequest("Slot is not available.");

        slot.Status = AppointmentStatus.Requested;
        slot.PatientId = patient.Id;
        slot.Reason = dto.Reason;

        await context.SaveChangesAsync();
        return Ok(MapToDto(slot));
    }

    [HttpGet("patient-available-slots")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<IEnumerable<AppointmentDto>>> GetPatientAvailableSlots(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int offsetMinutes,
        [FromQuery] string? query)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");
        if (patient.PsychologistId == null) return Ok(new List<AppointmentDto>());

        var startUtc = startDate.Date.AddMinutes(offsetMinutes);
        var endUtcExclusive = endDate.Date.AddDays(1).AddMinutes(offsetMinutes);

        var appointments = await context.Appointments
            .Where(a => a.PsychologistId == patient.PsychologistId
                        && a.Status == AppointmentStatus.Available
                        && a.Start >= startUtc
                        && a.Start < endUtcExclusive)
            .OrderBy(a => a.Start)
            .ToListAsync();

        var normalizedQuery = (query ?? string.Empty).Trim();
        if (normalizedQuery.Length == 0) return Ok(appointments.Select(MapToDto));

        var localAppointments = appointments.Select(a => new
        {
            Appointment = a,
            LocalStart = a.Start.AddMinutes(-offsetMinutes)
        });

        var weekdayFilter = ParseWeekday(normalizedQuery);
        if (weekdayFilter.HasValue)
        {
            return Ok(localAppointments
                .Where(x => x.LocalStart.DayOfWeek == weekdayFilter.Value)
                .Select(x => MapToDto(x.Appointment)));
        }

        if (TryParseDate(normalizedQuery, out var parsedDate))
        {
            return Ok(localAppointments
                .Where(x => x.LocalStart.Date == parsedDate.Date)
                .Select(x => MapToDto(x.Appointment)));
        }

        if (TryParseTime(normalizedQuery, out var parsedTime))
        {
            return Ok(localAppointments
                .Where(x => x.LocalStart.TimeOfDay.Hours == parsedTime.Hours &&
                            x.LocalStart.TimeOfDay.Minutes == parsedTime.Minutes)
                .Select(x => MapToDto(x.Appointment)));
        }

        return Ok(new List<AppointmentDto>());
    }

    [HttpPost("{id}/patient-reschedule")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> PatientReschedule(Guid id, PatientRescheduleDto dto)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");

        var currentAppointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (currentAppointment == null) return NotFound("Appointment not found.");

        if (currentAppointment.PatientId != patient.Id) return Forbid();
        if (currentAppointment.Status != AppointmentStatus.Confirmed)
            return BadRequest("Only confirmed appointments can be rescheduled.");

        var targetSlot = await context.Appointments.FirstOrDefaultAsync(a => a.Id == dto.TargetSlotId);
        if (targetSlot == null) return NotFound("Target slot not found.");

        if (targetSlot.PsychologistId != currentAppointment.PsychologistId)
            return BadRequest("Target slot does not belong to your psychologist.");
        if (targetSlot.Status != AppointmentStatus.Available)
            return BadRequest("Target slot is not available.");

        targetSlot.PatientId = currentAppointment.PatientId;
        targetSlot.Reason = currentAppointment.Reason;
        targetSlot.Status = AppointmentStatus.Requested;

        currentAppointment.PatientId = null;
        currentAppointment.Reason = null;
        currentAppointment.Status = AppointmentStatus.Available;

        await context.SaveChangesAsync();
        return Ok(MapToDto(targetSlot));
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateAppointmentStatusDto dto)
    {
        var userId = GetUserId();
        var userRole = User.FindFirstValue(ClaimTypes.Role);
        
        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Psychologist)
            .FirstOrDefaultAsync(a => a.Id == id);
            
        if (appointment == null) return NotFound("Appointment not found.");

        if (userRole == "Psychologist")
        {
            var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
            if (psychologist == null || appointment.PsychologistId != psychologist.Id) return Forbid();

            if (dto.Status == AppointmentStatus.Available)
            {
                // Rejecting a pending request should keep a canceled record for patient history
                // and create a new free slot for the same time.
                if (appointment.Status == AppointmentStatus.Requested && appointment.PatientId != null)
                {
                    var availableClone = new Appointment
                    {
                        Id = Guid.NewGuid(),
                        PsychologistId = appointment.PsychologistId,
                        Start = appointment.Start,
                        End = appointment.End,
                        Status = AppointmentStatus.Available
                    };

                    appointment.Status = AppointmentStatus.Canceled;
                    context.Appointments.Add(availableClone);
                }
                else
                {
                    appointment.Status = AppointmentStatus.Available;
                    appointment.PatientId = null;
                    appointment.Reason = null;
                }
            }
            else if (dto.Status == AppointmentStatus.Confirmed)
            {
                 appointment.Status = AppointmentStatus.Confirmed;
            }
            else if (dto.Status == AppointmentStatus.Canceled)
            {
                appointment.Status = AppointmentStatus.Canceled;
            }
             else if (dto.NewStart.HasValue && dto.NewEnd.HasValue)
            {
                appointment.Start = dto.NewStart.Value;
                appointment.End = dto.NewEnd.Value;
                appointment.Status = AppointmentStatus.Requested;
            }
            
        }
        else if (userRole == "Patient")
        {
            var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null || appointment.PatientId != patient.Id) return Forbid();

            // Patient logic (approve reschedule?)
            if (dto.Status == AppointmentStatus.Confirmed && appointment.Status == AppointmentStatus.Requested)
            {
               appointment.Status = AppointmentStatus.Confirmed;
            }
             else if (dto.Status == AppointmentStatus.Available) // Cancel
            {
                appointment.Status = AppointmentStatus.Available;
                appointment.PatientId = null;
                appointment.Reason = null;
            }
        }

        await context.SaveChangesAsync();
        return Ok(MapToDto(appointment));
    }

    [HttpPut("{id}/assign-patient")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> AssignPatient(Guid id, AssignPatientDto dto)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (appointment == null) return NotFound("Appointment not found.");

        if (appointment.PsychologistId != psychologist.Id) return Forbid();

        var patient = await context.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == dto.PatientId);
        if (patient == null) return NotFound("Patient not found.");

        if (patient.PsychologistId != psychologist.Id)
            return BadRequest("This patient is not linked to you.");

        appointment.PatientId = patient.Id;
        appointment.Patient = patient;
        appointment.Status = AppointmentStatus.Confirmed;

        await context.SaveChangesAsync();
        return Ok(MapToDto(appointment));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> DeleteSlot(Guid id)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appointment == null) return NotFound("Appointment not found.");

        if (appointment.PsychologistId != psychologist.Id) return Forbid();

        context.Appointments.Remove(appointment);
        await context.SaveChangesAsync();
        return Ok("Slot deleted.");
    }

    [HttpPost("{id}/reschedule")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> Reschedule(Guid id, RescheduleAppointmentDto dto)
    {
        var userId = GetUserId();
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appointment == null) return NotFound("Appointment not found.");
        if (appointment.PsychologistId != psychologist.Id) return Forbid();
        if (appointment.PatientId == null) return BadRequest("Cannot reschedule an empty slot.");

        var targetSlot = await context.Appointments
            .FirstOrDefaultAsync(a =>
                a.Id != appointment.Id &&
                a.PsychologistId == psychologist.Id &&
                a.Start == dto.NewStart &&
                a.End == dto.NewEnd);

        if (targetSlot != null)
        {
            if (targetSlot.Status != AppointmentStatus.Available)
                return BadRequest("Target slot is not available.");

            targetSlot.PatientId = appointment.PatientId;
            targetSlot.Reason = appointment.Reason;
            targetSlot.Status = AppointmentStatus.Confirmed;

            appointment.PatientId = null;
            appointment.Reason = null;
            appointment.Status = AppointmentStatus.Available;

            await context.SaveChangesAsync();
            return Ok(MapToDto(targetSlot));
        }

        if (!dto.CreateIfMissing)
            return NotFound("Target slot does not exist.");

        var overlapExists = await context.Appointments.AnyAsync(a =>
            a.Id != appointment.Id &&
            a.PsychologistId == psychologist.Id &&
            a.Start < dto.NewEnd &&
            dto.NewStart < a.End);

        if (overlapExists)
            return BadRequest("There is already an appointment in this time range.");

        var newAppointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PsychologistId = appointment.PsychologistId,
            PatientId = appointment.PatientId,
            Start = dto.NewStart,
            End = dto.NewEnd,
            Status = AppointmentStatus.Confirmed,
            Reason = appointment.Reason
        };

        appointment.PatientId = null;
        appointment.Reason = null;
        appointment.Status = AppointmentStatus.Available;

        context.Appointments.Add(newAppointment);

        await context.SaveChangesAsync();
        return Ok(MapToDto(newAppointment));
    }

    private static AppointmentDto MapToDto(Appointment a)
    {
        return new AppointmentDto
        {
            Id = a.Id,
            PsychologistId = a.PsychologistId,
            PatientId = a.PatientId,
            PatientName = a.Patient?.User?.Name,
            Start = a.Start,
            End = a.End,
            Status = a.Status,
            Reason = a.Reason
        };
    }

    private static AppointmentStatus SelectHighestPriorityStatus(IEnumerable<AppointmentStatus> statuses)
    {
        if (statuses.Contains(AppointmentStatus.Confirmed)) return AppointmentStatus.Confirmed;
        if (statuses.Contains(AppointmentStatus.Requested)) return AppointmentStatus.Requested;
        return AppointmentStatus.Canceled;
    }

    private static DayOfWeek? ParseWeekday(string input)
    {
        var normalized = input.Trim().ToLowerInvariant()
            .Replace("ç", "c")
            .Replace("á", "a")
            .Replace("à", "a")
            .Replace("â", "a")
            .Replace("ã", "a")
            .Replace("é", "e")
            .Replace("ê", "e")
            .Replace("í", "i")
            .Replace("ó", "o")
            .Replace("ô", "o")
            .Replace("õ", "o")
            .Replace("ú", "u");

        return normalized switch
        {
            "domingo" => DayOfWeek.Sunday,
            "segunda" or "segunda-feira" => DayOfWeek.Monday,
            "terca" or "terca-feira" => DayOfWeek.Tuesday,
            "quarta" or "quarta-feira" => DayOfWeek.Wednesday,
            "quinta" or "quinta-feira" => DayOfWeek.Thursday,
            "sexta" or "sexta-feira" => DayOfWeek.Friday,
            "sabado" => DayOfWeek.Saturday,
            _ => null
        };
    }

    private static bool TryParseDate(string input, out DateTime date)
    {
        var formats = new[] {"dd/MM/yyyy", "yyyy-MM-dd"};
        return DateTime.TryParseExact(
            input.Trim(),
            formats,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);
    }

    private static bool TryParseTime(string input, out TimeSpan time)
    {
        var formats = new[] {"HH:mm", "H:mm"};
        if (DateTime.TryParseExact(input.Trim(), formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
        {
            time = dt.TimeOfDay;
            return true;
        }

        time = default;
        return false;
    }
}
