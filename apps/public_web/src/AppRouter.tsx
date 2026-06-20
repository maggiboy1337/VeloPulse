import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TrackingStart } from './pages/TrackingStart';
import LiveTracking from './pages/LiveTracking';
import PublicMap from './pages/PublicMap';
import { ActiveSessions } from './pages/ActiveSessions';
import { SavedRoutes } from './pages/SavedRoutes';
import { CompletedActivities } from './pages/CompletedActivities';
import { ActivityDetail } from './pages/ActivityDetail';
import { Statistics } from './pages/Statistics';
import { Settings } from './pages/Settings';
import { AppDownload } from './pages/AppDownload';

// Private Route Wrapper
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Public Route Wrapper (redirect to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - NO LOGIN REQUIRED */}
        <Route path="/" element={<PublicMap />} />
        <Route path="/public/map" element={<PublicMap />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Private Routes with Layout */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/tracking/start" element={<TrackingStart />} />
                  <Route path="/tracking/live/:id" element={<LiveTracking />} />
                  <Route path="/sessions/active" element={<ActiveSessions />} />
                  <Route path="/routes" element={<SavedRoutes />} />
                  <Route path="/activities" element={<CompletedActivities />} />
                  <Route path="/activities/:id" element={<ActivityDetail />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/app-download" element={<AppDownload />} />

                  {/* Fallback redirect */}
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
