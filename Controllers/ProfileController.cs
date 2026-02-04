using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProfileController(ApplicationDbContext context, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("upload-picture")]
    public async Task<IActionResult> UploadProfilePicture(IFormFile file)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        if (userId == Guid.Empty) return Unauthorized();

        var user = await context.Users.FindAsync(userId);
        if (user == null) return NotFound("User not found.");

        if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

        var uploadsFolder = Path.Combine(env.WebRootPath, "uploads");
        if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Delete old picture if it exists
        if (!string.IsNullOrEmpty(user.ProfilePictureUrl))
        {
            var oldFileName = Path.GetFileName(user.ProfilePictureUrl);
            var oldFilePath = Path.Combine(uploadsFolder, oldFileName);
            if (System.IO.File.Exists(oldFilePath))
            {
                System.IO.File.Delete(oldFilePath);
            }
        }

        user.ProfilePictureUrl = $"/uploads/{fileName}";
        await context.SaveChangesAsync();

        return Ok(new { url = user.ProfilePictureUrl });
    }
}
