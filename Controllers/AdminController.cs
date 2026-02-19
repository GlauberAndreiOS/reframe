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
[Authorize(Roles = "Admin")]
public class AdminController(ApplicationDbContext context, IAuditService auditService) : ControllerBase
{
    private Guid GetUserId() => Guid.Parse(User.FindFirstValue("UserId") ?? Guid.Empty.ToString());

    [HttpPut("billing-policy")]
    public async Task<IActionResult> UpdateBillingPolicy(UpdateBillingPolicyDto dto)
    {
        var actor = GetUserId();
        var policy = await context.BillingPolicies.OrderByDescending(p => p.UpdatedAt).FirstOrDefaultAsync();
        if (policy == null)
        {
            policy = new BillingPolicy { Id = Guid.NewGuid() };
            context.BillingPolicies.Add(policy);
        }

        policy.Name = dto.Name;
        policy.Description = dto.Description;
        policy.IsActive = dto.IsActive;
        policy.UpdatedByUserId = actor;
        policy.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        await auditService.LogAsync(actor, "billing_policy_changed", nameof(BillingPolicy), policy.Id.ToString(), dto.Description, HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok(policy);
    }

    [HttpPost("appointments/{appointmentId:guid}/mark-no-show")]
    public async Task<IActionResult> MarkNoShow(Guid appointmentId, MarkNoShowDto dto)
    {
        var actor = GetUserId();
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == appointmentId);
        if (appointment == null) return NotFound();

        appointment.Status = AppointmentStatus.Canceled;
        appointment.Reason = $"No-show: {dto.Reason}";
        await context.SaveChangesAsync();

        await auditService.LogAsync(actor, "appointment_no_show_marked", nameof(Appointment), appointmentId.ToString(), dto.Reason, HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok();
    }

    [HttpPost("refunds/manual")]
    public async Task<IActionResult> ManualRefund(ManualRefundDto dto)
    {
        var actor = GetUserId();
        context.FinancialRecords.Add(new FinancialRecord
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            Amount = -Math.Abs(dto.Amount),
            Description = $"Manual refund: {dto.Reason}",
            OccurredAt = DateTime.UtcNow,
            LegalRetentionUntil = DateTime.UtcNow.AddYears(5)
        });

        await context.SaveChangesAsync();
        await auditService.LogAsync(actor, "manual_refund", nameof(FinancialRecord), dto.UserId.ToString(), dto.Reason, HttpContext.Connection.RemoteIpAddress?.ToString());

        return Ok();
    }

    [HttpPut("payout-account")]
    public async Task<IActionResult> UpdatePayoutAccount(UpdatePayoutAccountDto dto)
    {
        var actor = GetUserId();
        var payout = await context.PsychologistPayoutAccounts.FirstOrDefaultAsync(p => p.PsychologistId == dto.PsychologistId);
        if (payout == null)
        {
            payout = new PsychologistPayoutAccount
            {
                Id = Guid.NewGuid(),
                PsychologistId = dto.PsychologistId
            };
            context.PsychologistPayoutAccounts.Add(payout);
        }

        payout.GatewayAccountToken = dto.GatewayAccountToken;
        payout.Last4 = dto.Last4;
        payout.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        await auditService.LogAsync(actor, "payout_account_changed", nameof(PsychologistPayoutAccount), payout.Id.ToString(), $"PsychologistId={dto.PsychologistId}", HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok();
    }

    [HttpPut("terms")]
    public async Task<IActionResult> UpdateTerms(UpdateTermsDto dto)
    {
        var actor = GetUserId();
        var terms = new TermsOfServiceVersion
        {
            Id = Guid.NewGuid(),
            Version = dto.Version,
            Content = dto.Content,
            UpdatedByUserId = actor,
            EffectiveAt = DateTime.UtcNow
        };

        context.TermsOfServiceVersions.Add(terms);
        await context.SaveChangesAsync();

        await auditService.LogAsync(actor, "terms_changed", nameof(TermsOfServiceVersion), terms.Id.ToString(), $"version={dto.Version}", HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok(terms);
    }

    [HttpGet("audit-log")]
    public async Task<IActionResult> GetAuditLog([FromQuery] int take = 200)
    {
        var logs = await context.AuditLogs.OrderByDescending(a => a.OccurredAt).Take(Math.Clamp(take, 1, 1000)).ToListAsync();
        return Ok(logs);
    }
}
