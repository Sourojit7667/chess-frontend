import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./index.css";

// Pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import VsComputer from "./pages/VsComputer";
import TwoPlayer from "./pages/TwoPlayer";
import Multiplayer from "./pages/Multiplayer";
import Leaderboards from "./pages/Leaderboards";
import Profile from "./pages/Profile";
import StatsAnalysis from "./pages/StatsAnalysis";
import Achievements from "./pages/Achievements";
import Support from "./pages/Support";
import AuthCallback from "./pages/AuthCallback";

// Components
import Navbar from "./components/Navbar";
import SidePanel from "./components/SidePanel";
import SplashScreen from "./components/SplashScreen";
import { useState } from "react";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user needs onboarding (no username set)
  const isOnboarded = user?.user_metadata?.onboarded;
  const currentPath = window.location.pathname;
  
  if (!isOnboarded && currentPath !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

function AppContent() {
  const { user } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen">
      {user && (
        <>
          <Navbar onAvatarClick={() => setIsPanelOpen(true)} />
          <SidePanel
            isOpen={isPanelOpen}
            onClose={() => setIsPanelOpen(false)}
          />
        </>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vs-computer"
          element={
            <ProtectedRoute>
              <VsComputer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/two-player"
          element={
            <ProtectedRoute>
              <TwoPlayer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multiplayer"
          element={
            <ProtectedRoute>
              <Multiplayer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboards"
          element={
            <ProtectedRoute>
              <Leaderboards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <ProtectedRoute>
              <StatsAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/achievements"
          element={
            <ProtectedRoute>
              <Achievements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
