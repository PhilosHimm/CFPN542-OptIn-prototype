import { useState, useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { BottomNav } from "./BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { ONBOARDING_KEY } from "../pages/Onboarding";

export function Layout() {
  const { user, loading, isDemo, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 rounded-md3-full bg-primary-container flex items-center justify-center animate-pulse">
          <span className="text-title-lg font-medium text-on-primary-container">O</span>
        </div>
      </div>
    );
  }

  if (!isDemo && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!localStorage.getItem(ONBOARDING_KEY)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="w-full min-h-screen bg-surface flex justify-center">
      <div className="w-full max-w-[430px] sm:max-w-lg min-h-screen relative bg-surface">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="sticky top-0 z-[70] bg-gray-900 px-4 py-2 text-center">
            <p className="text-xs font-medium text-white">
              You are offline — some features may be unavailable
            </p>
          </div>
        )}
        {/* Session Expired Banner */}
        {sessionExpired && !isDemo && (
          <div className="sticky top-0 z-[60] bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between">
            <p className="text-xs font-medium text-rose-800">
              Your session has expired. Please sign in again.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 underline underline-offset-2 shrink-0 ml-2"
            >
              Sign In
            </button>
          </div>
        )}
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="sticky top-0 z-[60] bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
            <p className="text-xs font-medium text-amber-800">
              You're in Demo Mode — Create an account to get started.
            </p>
            <button
              onClick={() => navigate("/signup")}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0 ml-2"
            >
              Sign Up Free
            </button>
          </div>
        )}
        <div className="pb-[88px]">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
