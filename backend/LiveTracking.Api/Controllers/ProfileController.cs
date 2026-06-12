using LiveTracking.Application.DTOs.Profile;
using LiveTracking.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LiveTracking.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ProfileController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _context.Users
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();

        var profile = user.Profile;
        return Ok(new UserProfileDto(
            user.Id,
            user.Email!,
            profile?.DisplayName,
            profile?.ProfileImageUrl,
            profile?.Bio,
            profile?.Location,
            profile?.ShareHeartRate ?? true,
            profile?.ShareSpeed ?? true,
            profile?.ShareDistance ?? true
        ));
    }

    [HttpPut]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _context.Users
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();

        if (user.Profile == null)
        {
            user.Profile = new Domain.Entities.UserProfile
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.UserProfiles.Add(user.Profile);
        }

        user.Profile.DisplayName = request.DisplayName;
        user.Profile.Bio = request.Bio;
        user.Profile.Location = request.Location;
        user.Profile.ShareHeartRate = request.ShareHeartRate;
        user.Profile.ShareSpeed = request.ShareSpeed;
        user.Profile.ShareDistance = request.ShareDistance;
        user.Profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new UserProfileDto(
            user.Id,
            user.Email!,
            user.Profile.DisplayName,
            user.Profile.ProfileImageUrl,
            user.Profile.Bio,
            user.Profile.Location,
            user.Profile.ShareHeartRate,
            user.Profile.ShareSpeed,
            user.Profile.ShareDistance
        ));
    }
}
