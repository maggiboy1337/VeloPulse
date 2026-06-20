using Microsoft.AspNetCore.Mvc;

namespace LiveTracking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DownloadController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<DownloadController> _logger;

    public DownloadController(IWebHostEnvironment environment, ILogger<DownloadController> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Download der neuesten APK-Datei
    /// </summary>
    /// <returns>APK-Datei als Download</returns>
    [HttpGet("app/latest")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetLatestApk()
    {
        var apkFileName = "velopulse-latest.apk";
        var apkPath = Path.Combine(_environment.WebRootPath, "downloads", apkFileName);

        _logger.LogInformation("APK download requested. Looking for: {ApkPath}", apkPath);

        if (!System.IO.File.Exists(apkPath))
        {
            _logger.LogWarning("APK file not found at: {ApkPath}", apkPath);
            return NotFound(new { message = "APK file not found. Please contact the administrator." });
        }

        var fileBytes = System.IO.File.ReadAllBytes(apkPath);
        var fileInfo = new FileInfo(apkPath);

        _logger.LogInformation("APK download successful. File size: {FileSize} bytes, Last modified: {LastModified}", 
            fileInfo.Length, fileInfo.LastWriteTime);

        return File(fileBytes, "application/vnd.android.package-archive", "VeloPulse.apk");
    }

    /// <summary>
    /// Gibt Informationen über die aktuelle App-Version zurück
    /// </summary>
    /// <returns>Version-Informationen</returns>
    [HttpGet("app/version")]
    [ProducesResponseType(typeof(AppVersionDto), StatusCodes.Status200OK)]
    public ActionResult<AppVersionDto> GetVersion()
    {
        var apkFileName = "velopulse-latest.apk";
        var apkPath = Path.Combine(_environment.WebRootPath, "downloads", apkFileName);

        string version = "1.0.0";
        int buildNumber = 100;
        DateTime releaseDate = DateTime.UtcNow;
        bool apkExists = System.IO.File.Exists(apkPath);

        // Wenn APK existiert, verwende das Dateidatum als Release-Datum
        if (apkExists)
        {
            var fileInfo = new FileInfo(apkPath);
            releaseDate = fileInfo.LastWriteTimeUtc;
            
            // Build-Nummer aus Dateidatum generieren (z.B. 2025061401 für 14. Juni 2025)
            buildNumber = int.Parse(releaseDate.ToString("yyyyMMdd"));
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var downloadUrl = $"{baseUrl}/api/download/app/latest";

        var versionDto = new AppVersionDto(
            Version: version,
            BuildNumber: buildNumber,
            ReleaseDate: releaseDate,
            DownloadUrl: downloadUrl,
            ApkAvailable: apkExists,
            Changelog: @"
✨ Neue Features:
- GPS Live-Tracking mit Background-Support
- Offline-Modus mit Sync-Queue
- Öffentliche Live-Karte
- Route-Import via GPX

🐛 Bugfixes:
- Session-Timeout behoben (7 Tage Laufzeit)
- LiveSession wird automatisch bei Activity-Ende beendet
- Verbesserte GPS-Genauigkeit

🚀 Performance:
- Optimierte Karten-Performance
- Reduzierte Batterienutzung
            ".Trim()
        );

        _logger.LogInformation("Version info requested. APK available: {ApkAvailable}, Version: {Version}, Build: {BuildNumber}", 
            apkExists, version, buildNumber);

        return Ok(versionDto);
    }

    /// <summary>
    /// Prüft, ob eine neue App-Version verfügbar ist
    /// </summary>
    /// <param name="currentBuildNumber">Aktuelle Build-Nummer der installierten App</param>
    /// <returns>True wenn Update verfügbar ist</returns>
    [HttpGet("app/update-available")]
    [ProducesResponseType(typeof(UpdateCheckDto), StatusCodes.Status200OK)]
    public ActionResult<UpdateCheckDto> CheckForUpdate([FromQuery] int currentBuildNumber)
    {
        var latestVersion = GetVersion().Value!;
        var updateAvailable = latestVersion.BuildNumber > currentBuildNumber && latestVersion.ApkAvailable;

        _logger.LogInformation("Update check: Current build {CurrentBuild}, Latest build {LatestBuild}, Update available: {UpdateAvailable}", 
            currentBuildNumber, latestVersion.BuildNumber, updateAvailable);

        return Ok(new UpdateCheckDto(
            UpdateAvailable: updateAvailable,
            LatestVersion: latestVersion.Version,
            LatestBuildNumber: latestVersion.BuildNumber,
            DownloadUrl: latestVersion.DownloadUrl,
            Changelog: latestVersion.Changelog
        ));
    }
}

// DTOs
public record AppVersionDto(
    string Version,
    int BuildNumber,
    DateTime ReleaseDate,
    string DownloadUrl,
    bool ApkAvailable,
    string Changelog
);

public record UpdateCheckDto(
    bool UpdateAvailable,
    string LatestVersion,
    int LatestBuildNumber,
    string DownloadUrl,
    string Changelog
);
