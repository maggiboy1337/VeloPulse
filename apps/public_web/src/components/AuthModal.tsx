import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error('Bitte gib einen Namen ein');
        }
        // Validate password before sending
        if (password.length < 8) {
          throw new Error('Passwort muss mindestens 8 Zeichen lang sein');
        }
        if (!/[A-Z]/.test(password)) {
          throw new Error('Passwort muss einen Großbuchstaben enthalten');
        }
        if (!/[a-z]/.test(password)) {
          throw new Error('Passwort muss einen Kleinbuchstaben enthalten');
        }
        if (!/[0-9]/.test(password)) {
          throw new Error('Passwort muss eine Zahl enthalten');
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
          throw new Error('Passwort muss ein Sonderzeichen enthalten');
        }
        await register(email, password, displayName);
      }
      onClose();
      // Reset form
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>{isLogin ? 'Login' : 'Registrieren'}</h2>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="displayName">Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dein Name"
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              required
              minLength={8}
            />
            {!isLogin && password && (
              <div className="password-requirements">
                <small className={password.length >= 8 ? 'valid' : 'invalid'}>
                  ✓ Mindestens 8 Zeichen
                </small>
                <small className={/[A-Z]/.test(password) ? 'valid' : 'invalid'}>
                  ✓ Großbuchstabe
                </small>
                <small className={/[a-z]/.test(password) ? 'valid' : 'invalid'}>
                  ✓ Kleinbuchstabe
                </small>
                <small className={/[0-9]/.test(password) ? 'valid' : 'invalid'}>
                  ✓ Zahl
                </small>
                <small className={/[^A-Za-z0-9]/.test(password) ? 'valid' : 'invalid'}>
                  ✓ Sonderzeichen
                </small>
              </div>
            )}
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Lädt...' : (isLogin ? 'Einloggen' : 'Registrieren')}
          </button>
        </form>
        
        <div className="auth-switch">
          {isLogin ? 'Noch kein Account? ' : 'Bereits registriert? '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? 'Jetzt registrieren' : 'Zum Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
