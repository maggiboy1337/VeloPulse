import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  userId: string;
  email: string;
  displayName: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateProfile: (displayName: string, profileImageUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login fehlgeschlagen');
    }

    const data = await response.json();
    
    setToken(data.accessToken);
    setUser({
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      profileImageUrl: data.profileImageUrl
    });

    localStorage.setItem('authToken', data.accessToken);
    localStorage.setItem('currentUser', JSON.stringify({
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      profileImageUrl: data.profileImageUrl
    }));
  };

  const register = async (email: string, password: string, displayName: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle validation errors
      if (error.errors && Array.isArray(error.errors)) {
        throw new Error(error.errors.join(', '));
      }
      throw new Error(error.message || 'Registrierung fehlgeschlagen');
    }

    // Auto-login after registration
    await login(email, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  };

  const updateProfile = async (displayName: string, profileImageUrl?: string) => {
    if (!token) throw new Error('Nicht eingeloggt');

    const response = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ displayName, profileImageUrl })
    });

    if (!response.ok) {
      throw new Error('Profil-Update fehlgeschlagen');
    }

    const updatedUser = { ...user!, displayName, profileImageUrl };
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      isAuthenticated: !!token,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
