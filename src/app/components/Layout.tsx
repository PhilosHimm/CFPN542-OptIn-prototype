import { Navigate, Outlet } from "react-router";
import { BottomNav } from "./BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { ONBOARDING_KEY } from "../pages/Onboarding";

export function Layout() {
  const { user, loading, isDemo } = useAuth();

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
      <div className="w-full max-w-[430px] min-h-screen relative bg-surface">
        <div className="pb-[88px]">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
