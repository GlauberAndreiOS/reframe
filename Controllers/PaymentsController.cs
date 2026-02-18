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
[Authorize(Roles = "Patient")]
public class PaymentsController(ApplicationDbContext context, IPaymentGatewayTokenizationService tokenizationService) : ControllerBase
{
    private Guid GetUserId() => Guid.Parse(User.FindFirstValue("UserId") ?? Guid.Empty.ToString());

    [HttpPost("tokenize-card")]
    public async Task<IActionResult> TokenizeCard(SaveCardTokenDto dto)
    {
        var userId = GetUserId();
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return NotFound("Patient profile not found.");

        var token = tokenizationService.TokenizeCard(dto.CardNumber, dto.HolderName, dto.ExpMonth, dto.ExpYear);

        var paymentToken = new PaymentMethodToken
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            GatewayToken = token,
            Brand = dto.Brand,
            Last4 = dto.CardNumber.Length >= 4 ? dto.CardNumber[^4..] : null,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        context.PaymentMethodTokens.Add(paymentToken);
        await context.SaveChangesAsync();

        return Ok(new { paymentToken.Id, paymentToken.Brand, paymentToken.Last4, paymentToken.CreatedAt });
    }
}
