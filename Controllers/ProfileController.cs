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

        var fileExtension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(fileExtension)) return BadRequest("Invalid file extension.");

        var fileName = $"{userId}{fileExtension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        // Keep a single profile picture per user using userId-based filename.
        var existingUserPictures = Directory.GetFiles(uploadsFolder, $"{userId}.*");
        foreach (var existingFilePath in existingUserPictures)
            if (!string.Equals(existingFilePath, filePath, StringComparison.OrdinalIgnoreCase))
                System.IO.File.Delete(existingFilePath);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        user.ProfilePictureUrl = $"/uploads/{fileName}";
        await context.SaveChangesAsync();

        return Ok(new { url = user.ProfilePictureUrl });
    }
}
