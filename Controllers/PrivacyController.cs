using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using reframe.Services;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PrivacyController(ILgpdService lgpdService, IAuditService auditService) : ControllerBase
{
    private Guid GetUserId() => Guid.Parse(User.FindFirstValue("UserId") ?? Guid.Empty.ToString());

    [HttpGet("export")]
    public async Task<IActionResult> ExportMyData()
    {
        var userId = GetUserId();
        var payload = await lgpdService.ExportUserDataAsync(userId);

        await auditService.LogAsync(userId, "lgpd_export", "User", userId.ToString(), "Exportação de dados pessoais.", HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok(payload);
    }

    [HttpDelete("erase")]
    public async Task<IActionResult> EraseMyData()
    {
        var userId = GetUserId();
        var result = await lgpdService.RemoveOrAnonymizeUserAsync(userId);

        await auditService.LogAsync(userId, "lgpd_erasure", "User", userId.ToString(), result.Reason, HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok(new { result.Removed, result.Reason });
    }
}
