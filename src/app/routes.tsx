import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";

// Route-level code splitting: each page is loaded on demand rather than
// bundled into the initial JS chunk. This reduces the time-to-interactive
// on first load, especially on mobile connections.
const HomeScreen = lazy(() => import("./components/HomeScreen").then((m) => ({ default: m.HomeScreen })));
const CalendarScreen = lazy(() => import("./components/CalendarScreen").then((m) => ({ default: m.CalendarScreen })));
const CreateGameScreen = lazy(() => import("./components/CreateGameScreen").then((m) => ({ default: m.CreateGameScreen })));
const ChatsScreen = lazy(() => import("./components/ChatsScreen").then((m) => ({ default: m.ChatsScreen })));
const ProfileScreen = lazy(() => import("./components/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const GameViewScreen = lazy(() => import("./components/GameViewScreen").then((m) => ({ default: m.GameViewScreen })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./pages/Signup").then((m) => ({ default: m.Signup })));
const Onboarding = lazy(() => import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

// Wraps all routes inside AuthProvider so context identity is always
// co-located with its consumers — prevents stale module issues on HMR.
function AuthRoot() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    Component: AuthRoot,
    children: [
      { path: "/login", Component: Login },
      { path: "/signup", Component: Signup },
      { path: "/onboarding", Component: Onboarding },
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: HomeScreen },
          { path: "calendar", Component: CalendarScreen },
          { path: "create", Component: CreateGameScreen },
          { path: "chats", Component: ChatsScreen },
          { path: "profile", Component: ProfileScreen },
          { path: "game/:id", Component: GameViewScreen },
        ],
      },
    ],
  },
]);
