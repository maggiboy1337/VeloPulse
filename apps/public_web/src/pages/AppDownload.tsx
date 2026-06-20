import { useEffect, useState } from 'react';
import './AppDownload.css';

interface AppVersion {
  version: string;
  buildNumber: number;
  releaseDate: string;
  downloadUrl: string;
  apkAvailable: boolean;
  changelog: string;
}

export function AppDownload() {
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadAppVersion();
  }, []);

  const loadAppVersion = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/download/app/version`);
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Version-Info');
      }

      const data = await response.json();
      setAppVersion(data);
    } catch (err) {
      console.error('Error loading app version:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!appVersion?.apkAvailable) return;
    
    setDownloading(true);
    
    // Trigger download
    window.location.href = `${API_URL}/api/download/app/latest`;
    
    // Reset downloading state after 2 seconds
    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="app-download">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Lade App-Informationen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-download">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Fehler</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadAppVersion}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-download">
      <div className="page-header">
        <h1>📱 Android App</h1>
        <p className="page-subtitle">Lade die VeloPulse App für dein Android-Gerät herunter</p>
      </div>

      {/* Hero Section */}
      <div className="download-hero">
        <div className="hero-content">
          <div className="app-icon-large">📱</div>
          <h2>VeloPulse für Android</h2>
          <p className="hero-description">
            GPS Live-Tracking • Offline-Modus • Öffentliche Karte • GPX-Import
          </p>
        </div>
      </div>

      {/* Version Info Card */}
      {appVersion && (
        <div className="version-info-card">
          <div className="card-header">
            <h3>📦 Aktuelle Version</h3>
            {appVersion.apkAvailable ? (
              <span className="status-badge available">✓ Verfügbar</span>
            ) : (
              <span className="status-badge unavailable">✗ Nicht verfügbar</span>
            )}
          </div>

          <div className="version-details">
            <div className="detail-row">
              <span className="detail-label">Version:</span>
              <span className="detail-value">{appVersion.version}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Build-Nummer:</span>
              <span className="detail-value">{appVersion.buildNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Veröffentlicht:</span>
              <span className="detail-value">{formatDate(appVersion.releaseDate)}</span>
            </div>
          </div>

          {appVersion.apkAvailable && (
            <button 
              className={`btn-download-primary ${downloading ? 'downloading' : ''}`}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <span className="spinner-small"></span>
                  Download läuft...
                </>
              ) : (
                <>
                  📥 APK herunterladen
                </>
              )}
            </button>
          )}

          {!appVersion.apkAvailable && (
            <div className="unavailable-message">
              <span className="warning-icon">⚠️</span>
              <p>Die APK-Datei ist derzeit nicht verfügbar. Bitte kontaktiere den Administrator.</p>
            </div>
          )}
        </div>
      )}

      {/* Changelog */}
      {appVersion?.changelog && (
        <div className="changelog-card">
          <h3>🎉 Was ist neu?</h3>
          <div className="changelog-content">
            <pre>{appVersion.changelog}</pre>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="features-section">
        <h3>✨ Features</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h4>GPS Live-Tracking</h4>
            <p>Echtzeit-Positionserfassung mit hoher Genauigkeit, auch im Hintergrund</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📡</div>
            <h4>Offline-Modus</h4>
            <p>GPS-Punkte werden offline gespeichert und automatisch synchronisiert</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h4>Öffentliche Karte</h4>
            <p>Teile deine Live-Position mit Freunden und Familie über eine öffentliche Karte</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h4>Statistiken</h4>
            <p>Detaillierte Auswertungen: Distanz, Geschwindigkeit, Höhenmeter und mehr</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h4>GPX-Import</h4>
            <p>Importiere gespeicherte Routen aus GPX-Dateien</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏸️</div>
            <h4>Pausieren & Fortsetzen</h4>
            <p>Pausiere deine Aktivität und setze sie später fort</p>
          </div>
        </div>
      </div>

      {/* Installation Guide */}
      <div className="installation-guide">
        <h3>📖 Installation</h3>
        <div className="guide-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>APK herunterladen</h4>
              <p>Klicke auf den Download-Button oben und speichere die APK-Datei</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Installation erlauben</h4>
              <p>
                Android fragt nach Berechtigung für "Unbekannte Quellen". 
                Erlaube die Installation für deinen Browser oder Dateimanager.
              </p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>APK installieren</h4>
              <p>Öffne die heruntergeladene APK-Datei und folge den Anweisungen</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>GPS-Berechtigung erteilen</h4>
              <p>
                Beim ersten Start fragt die App nach GPS-Berechtigung. 
                Wähle "Immer erlauben" für das beste Tracking-Erlebnis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Requirements */}
      <div className="requirements-card">
        <h3>📱 Systemanforderungen</h3>
        <div className="requirements-list">
          <div className="requirement">
            <span className="requirement-icon">✓</span>
            <span>Android 7.0 (API Level 24) oder höher</span>
          </div>
          <div className="requirement">
            <span className="requirement-icon">✓</span>
            <span>GPS-Modul erforderlich</span>
          </div>
          <div className="requirement">
            <span className="requirement-icon">✓</span>
            <span>Mindestens 100 MB freier Speicherplatz</span>
          </div>
          <div className="requirement">
            <span className="requirement-icon">✓</span>
            <span>Internetverbindung für Live-Features (optional für Offline-Tracking)</span>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section">
        <h3>❓ Häufig gestellte Fragen</h3>
        
        <div className="faq-item">
          <h4>Ist die App kostenlos?</h4>
          <p>Ja, VeloPulse ist komplett kostenlos und ohne Werbung.</p>
        </div>

        <div className="faq-item">
          <h4>Warum ist die App nicht im Play Store?</h4>
          <p>
            Die App befindet sich derzeit in der Beta-Phase. 
            Eine Veröffentlichung im Play Store ist für die Zukunft geplant.
          </p>
        </div>

        <div className="faq-item">
          <h4>Funktioniert die App offline?</h4>
          <p>
            Ja! GPS-Tracking funktioniert vollständig offline. 
            Die Daten werden lokal gespeichert und automatisch synchronisiert, 
            sobald wieder eine Internetverbindung besteht.
          </p>
        </div>

        <div className="faq-item">
          <h4>Wie viel Akku verbraucht die App?</h4>
          <p>
            Der Akkuverbrauch hängt von der Nutzung ab. Bei aktivem GPS-Tracking 
            im Hintergrund ist mit einem erhöhten Akkuverbrauch zu rechnen. 
            Wir empfehlen eine Powerbank für längere Touren.
          </p>
        </div>

        <div className="faq-item">
          <h4>Kann ich meine Daten exportieren?</h4>
          <p>
            Ja, du kannst deine Aktivitäten als GPX-Dateien exportieren 
            und in anderen Apps wie Strava oder Komoot verwenden.
          </p>
        </div>
      </div>

      {/* Support Section */}
      <div className="support-section">
        <h3>💬 Support & Feedback</h3>
        <p>
          Bei Fragen, Problemen oder Feedback erreichst du uns über:
        </p>
        <div className="support-links">
          <a href="mailto:support@velopulse.de" className="support-link">
            📧 support@velopulse.de
          </a>
          <a href="https://github.com/maggiboy1337/VeloPulse/issues" className="support-link" target="_blank" rel="noopener noreferrer">
            🐛 GitHub Issues
          </a>
        </div>
      </div>
    </div>
  );
}
