using LiveTracking.Application.DTOs.Routes;
using LiveTracking.Domain.Entities;
using LiveTracking.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Xml.Linq;

namespace LiveTracking.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/routes")]
public class RoutesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RoutesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<RouteDto>>> GetRoutes()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var routes = await _context.Routes
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var routeDtos = routes.Select(r => new RouteDto(
            r.Id,
            r.Name,
            r.Description,
            SanitizeDouble(r.TotalDistanceMeters),
            SanitizeNullableDouble(r.MinElevationMeters),
            SanitizeNullableDouble(r.MaxElevationMeters),
            SanitizeNullableDouble(r.TotalAscentMeters),
            SanitizeNullableDouble(r.TotalDescentMeters),
            r.CreatedAt
        )).ToList();

        return Ok(routeDtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RouteDetailDto>> GetRoute(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var route = await _context.Routes
            .Include(r => r.RoutePoints.OrderBy(p => p.SequenceNumber))
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

        if (route == null) return NotFound();

        // For own routes, return all points (they're already downsampled to max 1000)
        var dto = new RouteDetailDto(
            route.Id,
            route.Name,
            route.Description,
            SanitizeDouble(route.TotalDistanceMeters),
            SanitizeNullableDouble(route.MinElevationMeters),
            SanitizeNullableDouble(route.MaxElevationMeters),
            SanitizeNullableDouble(route.TotalAscentMeters),
            SanitizeNullableDouble(route.TotalDescentMeters),
            route.CreatedAt,
            route.RoutePoints.Select(p => new RoutePointDto(
                p.SequenceNumber,
                SanitizeDouble(p.Latitude),
                SanitizeDouble(p.Longitude),
                SanitizeNullableDouble(p.ElevationMeters),
                SanitizeDouble(p.DistanceFromStartMeters)
            )).ToList()
        );

        return Ok(dto);
    }

    [HttpPost("import-gpx")]
    [RequestSizeLimit(104857600)] // 100 MB
    [DisableRequestSizeLimit] // Alternative for larger files
    public async Task<ActionResult<RouteDto>> ImportGpx(IFormFile file)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Keine Datei hochgeladen" });

            if (!file.FileName.EndsWith(".gpx", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Nur GPX-Dateien sind erlaubt" });

            Console.WriteLine($"Received GPX file: {file.FileName}, Size: {file.Length} bytes");

            string gpxContent;
            using (var reader = new StreamReader(file.OpenReadStream()))
            {
                gpxContent = await reader.ReadToEndAsync();
            }

            XDocument doc;
            try
            {
                doc = XDocument.Parse(gpxContent);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Ungültiges XML-Format", error = ex.Message });
            }

            XNamespace gpx = "http://www.topografix.com/GPX/1/1";

            var trackPoints = doc.Descendants(gpx + "trkpt")
                .Select((tp, index) => new
                {
                    Index = index,
                    Lat = double.Parse(tp.Attribute("lat")?.Value ?? "0", System.Globalization.CultureInfo.InvariantCulture),
                    Lon = double.Parse(tp.Attribute("lon")?.Value ?? "0", System.Globalization.CultureInfo.InvariantCulture),
                    Ele = tp.Element(gpx + "ele") != null ? ParseDouble(tp.Element(gpx + "ele")!.Value) : (double?)null
                })
                .ToList();

            if (!trackPoints.Any())
                return BadRequest(new { message = "GPX-Datei enthält keine Trackpunkte" });

            Console.WriteLine($"Found {trackPoints.Count} track points");

            // Downsample if there are too many points (max 1000 points)
            const int maxPoints = 1000;
            if (trackPoints.Count > maxPoints)
            {
                var samplingRate = (int)Math.Ceiling((double)trackPoints.Count / maxPoints);
                trackPoints = trackPoints.Where((tp, index) => index % samplingRate == 0 || index == trackPoints.Count - 1).ToList();
                Console.WriteLine($"Downsampled to {trackPoints.Count} points (sampling rate: {samplingRate})");
            }

            var route = new Domain.Entities.Route
            {
                UserId = userId,
                Name = file.FileName.Replace(".gpx", ""),
                CreatedAt = DateTime.UtcNow
            };

            double totalDistance = 0;
            double? minEle = null, maxEle = null;

            for (int i = 0; i < trackPoints.Count; i++)
            {
                var point = trackPoints[i];

                if (i > 0)
                {
                    var prev = trackPoints[i - 1];
                    var segmentDistance = CalculateDistance(prev.Lat, prev.Lon, point.Lat, point.Lon);

                    // Only add valid distances
                    if (!double.IsNaN(segmentDistance) && !double.IsInfinity(segmentDistance) && segmentDistance >= 0)
                    {
                        totalDistance += segmentDistance;
                    }
                }

                if (point.Ele.HasValue && !double.IsNaN(point.Ele.Value) && !double.IsInfinity(point.Ele.Value))
                {
                    minEle = minEle.HasValue ? Math.Min(minEle.Value, point.Ele.Value) : point.Ele.Value;
                    maxEle = maxEle.HasValue ? Math.Max(maxEle.Value, point.Ele.Value) : point.Ele.Value;
                }

                // Ensure the distance value is valid before storing
                var distanceToStore = totalDistance;
                if (double.IsNaN(distanceToStore) || double.IsInfinity(distanceToStore))
                {
                    distanceToStore = 0;
                }

                route.RoutePoints.Add(new RoutePoint
                {
                    RouteId = route.Id,
                    SequenceNumber = i,
                    Latitude = point.Lat,
                    Longitude = point.Lon,
                    ElevationMeters = point.Ele,
                    DistanceFromStartMeters = distanceToStore,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Ensure final values are valid
            if (double.IsNaN(totalDistance) || double.IsInfinity(totalDistance))
                totalDistance = 0;

            route.TotalDistanceMeters = totalDistance;
            route.MinElevationMeters = minEle;
            route.MaxElevationMeters = maxEle;

            Console.WriteLine($"Route created: {route.Name}, Distance: {totalDistance}m, Points: {route.RoutePoints.Count}");

            _context.Routes.Add(route);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoute), new { id = route.Id }, new RouteDto(
                route.Id,
                route.Name,
                route.Description,
                SanitizeDouble(route.TotalDistanceMeters),
                SanitizeNullableDouble(route.MinElevationMeters),
                SanitizeNullableDouble(route.MaxElevationMeters),
                SanitizeNullableDouble(route.TotalAscentMeters),
                SanitizeNullableDouble(route.TotalDescentMeters),
                route.CreatedAt
            ));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Ungültige GPX-Datei", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRoute(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var route = await _context.Routes.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

        if (route == null) return NotFound();

        _context.Routes.Remove(route);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        // Handle invalid coordinates
        if (double.IsNaN(lat1) || double.IsNaN(lon1) || double.IsNaN(lat2) || double.IsNaN(lon2) ||
            double.IsInfinity(lat1) || double.IsInfinity(lon1) || double.IsInfinity(lat2) || double.IsInfinity(lon2))
        {
            return 0;
        }

        // If points are identical, distance is 0
        if (Math.Abs(lat1 - lat2) < 0.000001 && Math.Abs(lon1 - lon2) < 0.000001)
        {
            return 0;
        }

        const double R = 6371000; // Earth radius in meters
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        // Clamp a to valid range [0, 1] to prevent NaN from Sqrt
        a = Math.Max(0, Math.Min(1, a));

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        var distance = R * c;

        // Ensure result is valid
        if (double.IsNaN(distance) || double.IsInfinity(distance))
        {
            return 0;
        }

        return distance;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;

    private static double? ParseDouble(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (double.TryParse(value, System.Globalization.NumberStyles.Any, 
            System.Globalization.CultureInfo.InvariantCulture, out var result))
        {
            // Ensure the value is valid (not NaN or Infinity)
            if (double.IsNaN(result) || double.IsInfinity(result))
                return null;

            return result;
        }

        return null;
    }

    private static double SanitizeDouble(double value)
    {
        if (double.IsNaN(value) || double.IsInfinity(value))
            return 0;
        return value;
    }

    private static double? SanitizeNullableDouble(double? value)
    {
        if (!value.HasValue)
            return null;

        if (double.IsNaN(value.Value) || double.IsInfinity(value.Value))
            return null;

        return value.Value;
    }
}
