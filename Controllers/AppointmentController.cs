using System.Security.Claims;
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;
using reframe.Services;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AppointmentController(
    ApplicationDbContext context,
    ISessionBillingDecisionService billingDecisionService) : ControllerBase
{
    private static readonly TimeSpan[] ChargeRetryDelays =
    {
        TimeSpan.FromHours(1),
        TimeSpan.FromHours(24),
        TimeSpan.FromHours(72)
    };

    private const int MaxChargeRetryAttempts = 3;
    private static readonly TimeSpan FinancialRegularizationWindow = TimeSpan.FromHours(72);

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

            // If patient is still pending approval/no linked psychologist, agenda must be empty (not an API error).
            if (patient.PsychologistId == null) return Ok(new List<AppointmentDto>());

            var appointments = await context.Appointments
                .Where(a => a.PsychologistId == patient.PsychologistId 
                            && a.Status != AppointmentStatus.Canceled
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
                            || a.Status == AppointmentStatus.Canceled
                            || a.Status == AppointmentStatus.Completed))
                            || a.Status == AppointmentStatus.FinancialPending))
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

                var isHoliday = await context.Holidays.AnyAsync(h =>
                    h.PsychologistId == psychologist.Id && h.Date.Date == start.Date);

                if (isHoliday)
                {
                    continue;
                }

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
                        Status = AppointmentStatus.Available,
                        SessionStatus = SessionStatus.Scheduled
                    });
                }
            }
        }

        await context.SaveChangesAsync();
        return Ok("Slots generated.");
    }

    [HttpGet("current-terms")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<CurrentTermsDto>> GetCurrentTerms([FromQuery] Guid slotId)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");

        var slot = await context.Appointments.FirstOrDefaultAsync(a => a.Id == slotId);
        if (slot == null) return NotFound("Slot not found.");

        if (slot.PsychologistId != patient.PsychologistId)
            return BadRequest("This slot does not belong to your psychologist.");

        var activeTerms = await context.TherapistTerms
            .Where(t => t.TherapistId == slot.PsychologistId && t.Active && t.EffectiveFrom <= DateTime.UtcNow)
            .OrderByDescending(t => t.Version)
            .FirstOrDefaultAsync();

        if (activeTerms == null)
            return NotFound("No active terms found for this therapist.");

        var alreadyAccepted = await context.PatientTermsAcceptances
            .AnyAsync(a => a.PatientId == patient.Id
                           && a.TherapistId == slot.PsychologistId
                           && a.TermsVersion == activeTerms.Version);

        return Ok(new CurrentTermsDto
        {
            Version = activeTerms.Version,
            Content = activeTerms.Content,
            EffectiveFrom = activeTerms.EffectiveFrom,
            AlreadyAccepted = alreadyAccepted
        });
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

        var hasBlockingFinancialPending = await HasBlockingFinancialPendingAsync(patient.Id);
        if (hasBlockingFinancialPending)
            return BadRequest("Você possui uma sessão com pendência financeira. Regularize o pagamento para realizar novos agendamentos.");

        if (slot.PsychologistId != patient.PsychologistId) return BadRequest("This slot does not belong to your psychologist.");
        if (slot.Status != AppointmentStatus.Available) return BadRequest("Slot is not available.");

        var isHoliday = await context.Holidays.AnyAsync(h =>
            h.PsychologistId == slot.PsychologistId && h.Date.Date == slot.Start.Date);
        if (isHoliday) return BadRequest("Slot is in a holiday block.");

        TherapyPackage? package = null;
        if (!dto.IsExtraSession)
        {
            package = await ResolveAndValidatePackage(patient.Id, dto.TherapyPackageId, slot.Start);
            if (package == null)
                return BadRequest("No valid active package found for this booking.");
        var activeTerms = await context.TherapistTerms
            .Where(t => t.TherapistId == slot.PsychologistId && t.Active && t.EffectiveFrom <= DateTime.UtcNow)
            .OrderByDescending(t => t.Version)
            .FirstOrDefaultAsync();

        if (activeTerms != null)
        {
            var alreadyAccepted = await context.PatientTermsAcceptances
                .AnyAsync(a => a.PatientId == patient.Id
                               && a.TherapistId == slot.PsychologistId
                               && a.TermsVersion == activeTerms.Version);

            if (!alreadyAccepted)
            {
                if (!dto.AcceptTerms)
                {
                    return BadRequest(new
                    {
                        message = "Você precisa aceitar os termos vigentes para concluir o agendamento.",
                        termsVersion = activeTerms.Version,
                        termsContent = activeTerms.Content,
                        effectiveFrom = activeTerms.EffectiveFrom
                    });
                }

                context.PatientTermsAcceptances.Add(new PatientTermsAcceptance
                {
                    Id = Guid.NewGuid(),
                    PatientId = patient.Id,
                    TherapistId = slot.PsychologistId,
                    TermsVersion = activeTerms.Version,
                    AcceptedAt = DateTime.UtcNow,
                    AppointmentId = slot.Id,
                    Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    Device = HttpContext.Request.Headers.UserAgent.ToString()
                });
            }
        }

        slot.Status = AppointmentStatus.Requested;
        slot.SessionStatus = SessionStatus.Scheduled;
        slot.PatientId = patient.Id;
        slot.Reason = dto.Reason;
        slot.IsExtraSession = dto.IsExtraSession;
        slot.TherapyPackageId = package?.Id;
        slot.ReservedAt = DateTime.UtcNow;

        if (package != null && package.SessionConsumptionPolicy == SessionConsumptionPolicy.OnBooking)
        {
            if (!TryConsumePackageSession(package, slot.Start, slot.ReservedAt.Value))
                return BadRequest("Package has no available sessions to consume.");

            slot.SessionConsumed = true;
            slot.SessionConsumedAt = slot.ReservedAt;
        }

        await ApplyBillingDecisionAsync(slot);

        await context.SaveChangesAsync();
        return Ok(MapToDto(slot));
    }

    [HttpPost("prebook-recurring")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<PrebookRecurringResultDto>> PrebookRecurring(PrebookRecurringAppointmentsDto dto)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");
        if (patient.PsychologistId == null) return BadRequest("Patient has no linked psychologist.");

        if (!TimeSpan.TryParse(dto.Time, out var time))
            return BadRequest("Invalid time format. Use HH:mm.");

        TherapyPackage? package = null;
        if (!dto.IsExtraSession)
        {
            package = await ResolveAndValidatePackage(patient.Id, dto.TherapyPackageId, dto.StartDate);
            if (package == null)
                return BadRequest("No valid active package found for recurring pre-booking.");
        }

        var result = new PrebookRecurringResultDto();
        var currentDate = dto.StartDate.Date;
        var endDate = dto.EndDate.Date;

        while (currentDate <= endDate)
        {
            if (!dto.Weekdays.Contains(currentDate.DayOfWeek))
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            var start = currentDate.Add(time).AddMinutes(dto.OffsetMinutes);
            var end = start.AddMinutes(dto.DurationMinutes);

            var isHoliday = await context.Holidays.AnyAsync(h =>
                h.PsychologistId == patient.PsychologistId.Value && h.Date.Date == currentDate);
            if (isHoliday)
            {
                result.SkippedDates.Add($"{currentDate:yyyy-MM-dd}: holiday");
                currentDate = currentDate.AddDays(1);
                continue;
            }

            var slot = await context.Appointments.FirstOrDefaultAsync(a =>
                a.PsychologistId == patient.PsychologistId.Value &&
                a.Start == start &&
                a.End == end);

            if (slot == null || slot.Status != AppointmentStatus.Available)
            {
                result.SkippedDates.Add($"{currentDate:yyyy-MM-dd}: unavailable slot");
                currentDate = currentDate.AddDays(1);
                continue;
            }

            if (package != null && !IsPackageReservationAllowed(package, start, DateTime.UtcNow))
            {
                result.SkippedDates.Add($"{currentDate:yyyy-MM-dd}: package expired for new reservation");
                currentDate = currentDate.AddDays(1);
                continue;
            }

            slot.Status = AppointmentStatus.Requested;
            slot.PatientId = patient.Id;
            slot.Reason = dto.Reason;
            slot.TherapyPackageId = package?.Id;
            slot.IsExtraSession = dto.IsExtraSession;
            slot.ReservedAt = DateTime.UtcNow;
            // Pre-booking reserves without immediate consumption.

            result.ReservedAppointments.Add(MapToDto(slot));
            currentDate = currentDate.AddDays(1);
        }

        await context.SaveChangesAsync();
        return Ok(result);
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

        var hasBlockingFinancialPending = await HasBlockingFinancialPendingAsync(patient.Id, currentAppointment.Id);
        if (hasBlockingFinancialPending)
            return BadRequest("Você possui uma sessão com pendência financeira. Regularize o pagamento para reagendar.");

        var targetSlot = await context.Appointments.FirstOrDefaultAsync(a => a.Id == dto.TargetSlotId);
        if (targetSlot == null) return NotFound("Target slot not found.");

        if (targetSlot.PsychologistId != currentAppointment.PsychologistId)
            return BadRequest("Target slot does not belong to your psychologist.");
        if (targetSlot.Status != AppointmentStatus.Available)
            return BadRequest("Target slot is not available.");

        var isHoliday = await context.Holidays.AnyAsync(h =>
            h.PsychologistId == targetSlot.PsychologistId && h.Date.Date == targetSlot.Start.Date);
        if (isHoliday) return BadRequest("Target slot is in a holiday block.");

        if (currentAppointment.TherapyPackageId != null)
        {
            var package = await context.TherapyPackages.FirstOrDefaultAsync(tp => tp.Id == currentAppointment.TherapyPackageId);
            if (package == null) return BadRequest("Linked package not found.");

            if (!IsPackageReservationAllowed(package, targetSlot.Start, currentAppointment.ReservedAt))
                return BadRequest("Package cannot reserve the target slot date.");
        }

        targetSlot.PatientId = currentAppointment.PatientId;
        targetSlot.Reason = currentAppointment.Reason;
        targetSlot.Status = AppointmentStatus.Requested;
        targetSlot.IsExtraSession = currentAppointment.IsExtraSession;
        targetSlot.TherapyPackageId = currentAppointment.TherapyPackageId;
        targetSlot.ReservedAt = currentAppointment.ReservedAt ?? DateTime.UtcNow;
        targetSlot.SessionConsumed = currentAppointment.SessionConsumed;
        targetSlot.SessionConsumedAt = currentAppointment.SessionConsumedAt;
        targetSlot.SessionStatus = SessionStatus.Scheduled;

        currentAppointment.PatientId = null;
        currentAppointment.Reason = null;
        currentAppointment.Status = AppointmentStatus.Available;
        currentAppointment.IsExtraSession = false;
        currentAppointment.TherapyPackageId = null;
        currentAppointment.ReservedAt = null;
        currentAppointment.SessionConsumed = false;
        currentAppointment.SessionConsumedAt = null;
        currentAppointment.SessionStatus = SessionStatus.Scheduled;

        await ApplyBillingDecisionAsync(targetSlot);

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

                    if (appointment.SessionConsumed && appointment.TherapyPackageId != null)
                    {
                        var package = await context.TherapyPackages.FirstOrDefaultAsync(tp => tp.Id == appointment.TherapyPackageId);
                        if (package != null && package.UsedSessions > 0)
                        {
                            package.UsedSessions -= 1;
                        }
                    }

                    appointment.Status = AppointmentStatus.Canceled;
                    appointment.SessionStatus = SessionStatus.CanceledByTherapist;
                    context.Appointments.Add(availableClone);
                }
                else
                {
                    if (appointment.SessionConsumed && appointment.TherapyPackageId != null)
                    {
                        var package = await context.TherapyPackages.FirstOrDefaultAsync(tp => tp.Id == appointment.TherapyPackageId);
                        if (package != null && package.UsedSessions > 0)
                        {
                            package.UsedSessions -= 1;
                        }
                    }

                    appointment.Status = AppointmentStatus.Available;
                    appointment.SessionStatus = SessionStatus.Scheduled;
                    appointment.PatientId = null;
                    appointment.Reason = null;
                    appointment.IsExtraSession = false;
                    appointment.TherapyPackageId = null;
                    appointment.ReservedAt = null;
                    appointment.SessionConsumed = false;
                    appointment.SessionConsumedAt = null;
                }
            }
            else if (dto.Status == AppointmentStatus.Confirmed)
            {
                appointment.Status = AppointmentStatus.Confirmed;
                await ConsumeIfRequiredByPolicy(appointment, SessionConsumptionPolicy.OnAttendanceConfirmation);
                appointment.Status = AppointmentStatus.Completed;
                appointment.SessionStatus = SessionStatus.Scheduled;
            }
            else if (dto.Status == AppointmentStatus.Canceled)
            {
                if (appointment.SessionConsumed && appointment.TherapyPackageId != null)
                {
                    var package = await context.TherapyPackages.FirstOrDefaultAsync(tp => tp.Id == appointment.TherapyPackageId);
                    if (package != null && package.UsedSessions > 0)
                    {
                        package.UsedSessions -= 1;
                    }
                }

                appointment.Status = AppointmentStatus.Canceled;
                appointment.SessionConsumed = false;
                appointment.SessionConsumedAt = null;
                appointment.SessionStatus = SessionStatus.CanceledByTherapist;
            }
             else if (dto.NewStart.HasValue && dto.NewEnd.HasValue)
            {
                appointment.Start = dto.NewStart.Value;
                appointment.End = dto.NewEnd.Value;
                appointment.Status = AppointmentStatus.Requested;
                appointment.SessionStatus = SessionStatus.Scheduled;
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
               appointment.SessionStatus = SessionStatus.Scheduled;
            }
             else if (dto.Status == AppointmentStatus.Available) // Cancel
            {
                if (appointment.SessionConsumed && appointment.TherapyPackageId != null)
                {
                    var package = await context.TherapyPackages.FirstOrDefaultAsync(tp => tp.Id == appointment.TherapyPackageId);
                    if (package != null && package.UsedSessions > 0)
                    {
                        package.UsedSessions -= 1;
                    }
                }

                appointment.Status = AppointmentStatus.Available;
                appointment.SessionStatus = SessionStatus.CanceledByPatient;
                appointment.PatientId = null;
                appointment.Reason = null;
                appointment.IsExtraSession = false;
                appointment.TherapyPackageId = null;
                appointment.ReservedAt = null;
                appointment.SessionConsumed = false;
                appointment.SessionConsumedAt = null;
            }
        }

        await ApplyBillingDecisionAsync(appointment);

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
        appointment.SessionStatus = SessionStatus.Scheduled;

        await ApplyBillingDecisionAsync(appointment);

        await context.SaveChangesAsync();
        return Ok(MapToDto(appointment));
    }

    [HttpPost("{id}/charge-failed")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<FinancialPendingStatusDto>> MarkChargeFailed(Guid id, MarkChargeFailedDto dto)
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
        if (appointment.PatientId == null) return BadRequest("Appointment has no patient linked.");

        var failedAt = dto.ChargeFailedAtUtc ?? DateTime.UtcNow;
        var nextAttempt = appointment.ChargeRetryAttemptCount < ChargeRetryDelays.Length
            ? failedAt.Add(ChargeRetryDelays[appointment.ChargeRetryAttemptCount])
            : null;

        appointment.Status = AppointmentStatus.FinancialPending;
        appointment.ChargeFailedAtUtc = failedAt;
        appointment.FinancialRegularizationDeadlineUtc ??= failedAt.Add(FinancialRegularizationWindow);
        appointment.ChargeRetryAttemptCount += 1;
        appointment.NextChargeRetryAtUtc = nextAttempt;
        appointment.LastChargeFailureReason = string.IsNullOrWhiteSpace(dto.FailureReason)
            ? "charge_failed"
            : dto.FailureReason.Trim();

        await context.SaveChangesAsync();
        return Ok(BuildFinancialPendingStatus(appointment));
    }

    [HttpPost("{id}/payment-method")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<FinancialPendingStatusDto>> UpdatePaymentMethod(Guid id, UpdatePaymentMethodDto dto)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (appointment == null) return NotFound("Appointment not found.");
        if (appointment.PatientId != patient.Id) return Forbid();

        if (string.IsNullOrWhiteSpace(dto.MethodReference))
            return BadRequest("MethodReference is required.");

        appointment.PaymentProvider = string.IsNullOrWhiteSpace(dto.Provider) ? "MercadoPago" : dto.Provider.Trim();
        appointment.PaymentMethodReference = dto.MethodReference.Trim();
        appointment.PaymentMethodLastFourDigits = string.IsNullOrWhiteSpace(dto.LastFourDigits)
            ? null
            : dto.LastFourDigits.Trim();

        if (appointment.Status == AppointmentStatus.FinancialPending)
        {
            appointment.NextChargeRetryAtUtc = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        return Ok(BuildFinancialPendingStatus(appointment));
    }

    [HttpGet("{id}/financial-status")]
    [Authorize]
    public async Task<ActionResult<FinancialPendingStatusDto>> GetFinancialStatus(Guid id)
    {
        var userId = GetUserId();
        var userRole = User.FindFirstValue(ClaimTypes.Role);

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (appointment == null) return NotFound("Appointment not found.");

        if (userRole == "Psychologist")
        {
            var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
            if (psychologist == null || appointment.PsychologistId != psychologist.Id) return Forbid();
        }
        else if (userRole == "Patient")
        {
            var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null || appointment.PatientId != patient.Id) return Forbid();
        }
        else
        {
            return Forbid();
        }

        return Ok(BuildFinancialPendingStatus(appointment));
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
            targetSlot.IsExtraSession = appointment.IsExtraSession;
            targetSlot.TherapyPackageId = appointment.TherapyPackageId;
            targetSlot.ReservedAt = appointment.ReservedAt;
            targetSlot.SessionConsumed = appointment.SessionConsumed;
            targetSlot.SessionConsumedAt = appointment.SessionConsumedAt;
            targetSlot.SessionStatus = SessionStatus.Scheduled;

            appointment.PatientId = null;
            appointment.Reason = null;
            appointment.Status = AppointmentStatus.Available;
            appointment.IsExtraSession = false;
            appointment.TherapyPackageId = null;
            appointment.ReservedAt = null;
            appointment.SessionConsumed = false;
            appointment.SessionConsumedAt = null;
            appointment.SessionStatus = SessionStatus.Scheduled;

            await ApplyBillingDecisionAsync(targetSlot);

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
            Reason = appointment.Reason,
            IsExtraSession = appointment.IsExtraSession,
            TherapyPackageId = appointment.TherapyPackageId,
            ReservedAt = appointment.ReservedAt,
            SessionConsumed = appointment.SessionConsumed,
            SessionConsumedAt = appointment.SessionConsumedAt
            SessionStatus = SessionStatus.Scheduled,
            Reason = appointment.Reason
        };

        appointment.PatientId = null;
        appointment.Reason = null;
        appointment.Status = AppointmentStatus.Available;
        appointment.IsExtraSession = false;
        appointment.TherapyPackageId = null;
        appointment.ReservedAt = null;
        appointment.SessionConsumed = false;
        appointment.SessionConsumedAt = null;
        appointment.SessionStatus = SessionStatus.Scheduled;

        context.Appointments.Add(newAppointment);

        await ApplyBillingDecisionAsync(newAppointment);

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
            Reason = a.Reason,
            TherapyPackageId = a.TherapyPackageId,
            IsExtraSession = a.IsExtraSession,
            SessionConsumed = a.SessionConsumed
            ChargeFailedAtUtc = a.ChargeFailedAtUtc,
            FinancialRegularizationDeadlineUtc = a.FinancialRegularizationDeadlineUtc,
            ChargeRetryAttemptCount = a.ChargeRetryAttemptCount,
            NextChargeRetryAtUtc = a.NextChargeRetryAtUtc,
            LastChargeFailureReason = a.LastChargeFailureReason,
            PaymentProvider = a.PaymentProvider,
            PaymentMethodLastFourDigits = a.PaymentMethodLastFourDigits
            SessionStatus = a.SessionStatus,
            PaymentStatus = a.PaymentStatus,
            ChargeDecision = a.ChargeDecision,
            DecisionReason = a.DecisionReason,
        };
    }

    private async Task ApplyBillingDecisionAsync(Appointment appointment)
    {
        var psychologist = appointment.Psychologist ??
                           await context.Psychologists.FirstOrDefaultAsync(p => p.Id == appointment.PsychologistId);

        var policy = psychologist is null
            ? new PsychologistBillingPolicy()
            : new PsychologistBillingPolicy
            {
                ChargeTiming = psychologist.BillingChargeTiming,
                FreeCancellationWindowHours = psychologist.FreeCancellationWindowHours
            };

        var billingInput = new SessionBillingInput
        {
            SessionStartUtc = appointment.Start,
            DecisionAtUtc = DateTime.UtcNow,
            SessionStatus = appointment.SessionStatus,
            Policy = policy,
            Package = new SessionPackageContext
            {
                // TODO: replace with real package lookup when package model is available.
                HasActivePackage = false,
                RemainingSessions = 0
            }
        };

        var decision = billingDecisionService.Decide(billingInput);
        appointment.ChargeDecision = decision.Decision;
        appointment.DecisionReason = decision.DecisionReason;
        appointment.BillingDecisionAt = billingInput.DecisionAtUtc;
        appointment.PaymentStatus = PaymentStatus.Pending;
    }

    private async Task<TherapyPackage?> ResolveAndValidatePackage(Guid patientId, Guid? therapyPackageId, DateTime slotStart)
    {
        var packageQuery = context.TherapyPackages.Where(tp => tp.PatientId == patientId);

        if (therapyPackageId.HasValue)
        {
            packageQuery = packageQuery.Where(tp => tp.Id == therapyPackageId.Value);
        }
        else
        {
            packageQuery = packageQuery.OrderByDescending(tp => tp.StartDate);
        }

        var package = await packageQuery.FirstOrDefaultAsync();
        if (package == null) return null;

        if (!IsPackageReservationAllowed(package, slotStart, DateTime.UtcNow))
            return null;

        return package;
    }

    private static bool IsPackageReservationAllowed(TherapyPackage package, DateTime slotStart, DateTime? reservedAt)
    {
        if (package.Status is TherapyPackageStatus.Canceled or TherapyPackageStatus.Paused)
            return false;

        var inRange = slotStart.Date >= package.StartDate.Date && slotStart.Date <= package.EndDate.Date;
        if (inRange) return true;

        if (slotStart.Date > package.EndDate.Date && reservedAt.HasValue)
        {
            return reservedAt.Value.Date <= package.EndDate.Date;
        }

        return false;
    }

    private static bool TryConsumePackageSession(TherapyPackage package, DateTime slotStart, DateTime consumedAt)
    {
        if (!IsPackageReservationAllowed(package, slotStart, consumedAt))
            return false;

        if (package.UsedSessions >= package.TotalSessions)
            return false;

        package.UsedSessions += 1;
        return true;
    }

    private async Task ConsumeIfRequiredByPolicy(Appointment appointment, SessionConsumptionPolicy eventPolicy)
    {
        if (appointment.IsExtraSession || appointment.SessionConsumed || appointment.TherapyPackageId == null)
            return;

        var package = await context.TherapyPackages.FirstOrDefaultAsync(tp => tp.Id == appointment.TherapyPackageId.Value);
        if (package == null) return;

        if (package.SessionConsumptionPolicy != eventPolicy)
            return;

        if (TryConsumePackageSession(package, appointment.Start, DateTime.UtcNow))
        {
            appointment.SessionConsumed = true;
            appointment.SessionConsumedAt = DateTime.UtcNow;
        }
    }

    private static AppointmentStatus SelectHighestPriorityStatus(IEnumerable<AppointmentStatus> statuses)
    {
        if (statuses.Contains(AppointmentStatus.Completed)) return AppointmentStatus.Completed;
        if (statuses.Contains(AppointmentStatus.FinancialPending)) return AppointmentStatus.FinancialPending;
        if (statuses.Contains(AppointmentStatus.Confirmed)) return AppointmentStatus.Confirmed;
        if (statuses.Contains(AppointmentStatus.Requested)) return AppointmentStatus.Requested;
        return AppointmentStatus.Canceled;
    }

    private async Task<bool> HasBlockingFinancialPendingAsync(Guid patientId, Guid? ignoreAppointmentId = null)
    {
        var now = DateTime.UtcNow;

        return await context.Appointments.AnyAsync(a =>
            a.PatientId == patientId
            && a.Status == AppointmentStatus.FinancialPending
            && (ignoreAppointmentId == null || a.Id != ignoreAppointmentId)
            && (
                a.ChargeRetryAttemptCount >= MaxChargeRetryAttempts
                || (a.FinancialRegularizationDeadlineUtc.HasValue && a.FinancialRegularizationDeadlineUtc.Value < now)
            ));
    }

    private static FinancialPendingStatusDto BuildFinancialPendingStatus(Appointment appointment)
    {
        var retryLimitReached = appointment.ChargeRetryAttemptCount >= MaxChargeRetryAttempts;
        var now = DateTime.UtcNow;
        var deadlineExpired = appointment.FinancialRegularizationDeadlineUtc.HasValue
            && appointment.FinancialRegularizationDeadlineUtc.Value < now;
        var blocksNextScheduling = appointment.Status == AppointmentStatus.FinancialPending
            && (retryLimitReached || deadlineExpired);

        var patientName = appointment.Patient?.User?.Name ?? "Paciente";
        var notificationMessage =
            $"{patientName}, houve falha na cobrança da sessão. Atualize o método de pagamento para evitar impacto nos próximos agendamentos.";

        return new FinancialPendingStatusDto
        {
            AppointmentId = appointment.Id,
            ChargeFailedAtUtc = appointment.ChargeFailedAtUtc,
            FinancialRegularizationDeadlineUtc = appointment.FinancialRegularizationDeadlineUtc,
            ChargeRetryAttemptCount = appointment.ChargeRetryAttemptCount,
            NextChargeRetryAtUtc = appointment.NextChargeRetryAtUtc,
            RetryLimitReached = retryLimitReached,
            MaxAttempts = MaxChargeRetryAttempts,
            BlocksNextScheduling = blocksNextScheduling,
            LastChargeFailureReason = appointment.LastChargeFailureReason,
            PaymentProvider = appointment.PaymentProvider,
            PaymentMethodLastFourDigits = appointment.PaymentMethodLastFourDigits,
            PatientNotificationMessage = notificationMessage
        };
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
