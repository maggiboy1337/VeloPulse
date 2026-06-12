import './SessionExpiredModal.css';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function SessionExpiredModal({ isOpen, onClose, onLogout }: SessionExpiredModalProps) {
  if (!isOpen) return null;

  const handleLogout = () => {
    onLogout();
    onClose();
    window.location.reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content session-expired-modal" onClick={(e) => e.stopPropagation()}>
        <div className="session-expired-icon">⚠️</div>
        <h2>Sitzung abgelaufen</h2>
        <p>Ihr Login-Token ist nicht mehr gültig.</p>
        <p className="session-expired-hint">
          Dies passiert wenn das Backend neu gestartet wurde oder Ihre Session abgelaufen ist.
        </p>
        <div className="session-expired-actions">
          <button className="btn btn-primary" onClick={handleLogout}>
            Neu einloggen
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
