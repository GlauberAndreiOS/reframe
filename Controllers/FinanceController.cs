using System.Security.Claims;
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
public class FinanceController(ApplicationDbContext context, INotificationDispatcher notificationDispatcher) : ControllerBase
{
    private Guid GetUserId() => Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());

    [HttpPost("charge-success")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> ChargeSuccess(FinanceEventDto dto)
    {
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == dto.AppointmentId);
        if (appointment == null) return NotFound("Appointment not found.");

        var existing = await context.SessionReceipts.FirstOrDefaultAsync(r => r.AppointmentId == dto.AppointmentId);
        if (existing == null)
        {
            existing = new SessionReceipt
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                PatientId = appointment.PatientId,
                PsychologistId = appointment.PsychologistId,
                Amount = dto.Amount,
                Currency = dto.Currency,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? "Cobrança efetuada" : dto.Description,
                Status = ReceiptStatus.Charged,
                IssuedAt = DateTime.UtcNow
            };
            context.SessionReceipts.Add(existing);
        }
        else
        {
            existing.Amount = dto.Amount;
            existing.Currency = dto.Currency;
            existing.Description = string.IsNullOrWhiteSpace(dto.Description) ? "Cobrança efetuada" : dto.Description;
            existing.Status = ReceiptStatus.Charged;
            existing.IssuedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        await notificationDispatcher.DispatchAsync(NotificationTemplate.ChargeSucceeded, appointment.Id);

        return Ok(existing.Id);
    }

    [HttpPost("charge-failed")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> ChargeFailed(FinanceEventDto dto)
    {
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == dto.AppointmentId);
        if (appointment == null) return NotFound("Appointment not found.");

        var existing = await context.SessionReceipts.FirstOrDefaultAsync(r => r.AppointmentId == dto.AppointmentId);
        if (existing == null)
        {
            existing = new SessionReceipt
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                PatientId = appointment.PatientId,
                PsychologistId = appointment.PsychologistId,
                Amount = dto.Amount,
                Currency = dto.Currency,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? "Cobrança falhou" : dto.Description,
                Status = ReceiptStatus.ChargeFailed,
                IssuedAt = DateTime.UtcNow
            };
            context.SessionReceipts.Add(existing);
        }
        else
        {
            existing.Amount = dto.Amount;
            existing.Currency = dto.Currency;
            existing.Description = string.IsNullOrWhiteSpace(dto.Description) ? "Cobrança falhou" : dto.Description;
            existing.Status = ReceiptStatus.ChargeFailed;
            existing.IssuedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        await notificationDispatcher.DispatchAsync(NotificationTemplate.ChargeFailed, appointment.Id);

        return Ok(existing.Id);
    }

    [HttpPost("refund")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> Refund(FinanceEventDto dto)
    {
        var receipt = await context.SessionReceipts.FirstOrDefaultAsync(r => r.AppointmentId == dto.AppointmentId);
        if (receipt == null) return NotFound("Receipt not found for appointment.");

        receipt.Status = ReceiptStatus.Refunded;
        receipt.Description = string.IsNullOrWhiteSpace(dto.Description) ? "Estorno emitido" : dto.Description;
        receipt.IssuedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        await notificationDispatcher.DispatchAsync(NotificationTemplate.RefundIssued, receipt.AppointmentId);
        return Ok(receipt.Id);
    }

    [HttpPost("payout")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> Payout(FinanceEventDto dto)
    {
        var receipt = await context.SessionReceipts.FirstOrDefaultAsync(r => r.AppointmentId == dto.AppointmentId);
        if (receipt == null) return NotFound("Receipt not found for appointment.");

        receipt.Status = ReceiptStatus.PayoutCompleted;
        receipt.Description = string.IsNullOrWhiteSpace(dto.Description) ? "Repasse realizado" : dto.Description;
        receipt.IssuedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        await notificationDispatcher.DispatchAsync(NotificationTemplate.PayoutCompleted, receipt.AppointmentId);
        return Ok(receipt.Id);
    }

    [HttpGet("receipts-center")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<IEnumerable<SessionReceiptDto>>> GetReceiptsCenter()
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");

        var receipts = await context.SessionReceipts
            .Include(r => r.Appointment)
            .Where(r => r.PatientId == patient.Id)
            .OrderByDescending(r => r.IssuedAt)
            .ToListAsync();

        var appointmentIds = receipts.Select(r => r.AppointmentId).Distinct().ToList();
        var logs = await context.NotificationLogs
            .Where(n => n.AppointmentId != null && appointmentIds.Contains(n.AppointmentId.Value))
            .OrderByDescending(n => n.SentAt)
            .ToListAsync();

        var groupedLogs = logs
            .GroupBy(l => l.AppointmentId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(MapLog).ToList());

        return Ok(receipts.Select(r => new SessionReceiptDto
        {
            Id = r.Id,
            AppointmentId = r.AppointmentId,
            SessionStart = r.Appointment?.Start ?? DateTime.MinValue,
            SessionEnd = r.Appointment?.End ?? DateTime.MinValue,
            Amount = r.Amount,
            Currency = r.Currency,
            Status = r.Status,
            Description = r.Description,
            IssuedAt = r.IssuedAt,
            NotificationHistory = groupedLogs.TryGetValue(r.AppointmentId, out var history)
                ? history
                : new List<NotificationLogDto>()
        }));
    }

    private static NotificationLogDto MapLog(NotificationLog log)
    {
        return new NotificationLogDto
        {
            Template = log.Template,
            Channel = log.Channel,
            SentAt = log.SentAt,
            DeliveryStatus = log.DeliveryStatus
        };
    }
}
