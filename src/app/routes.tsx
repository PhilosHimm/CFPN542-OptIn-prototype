import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation, useParams } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { ChatsScreen } from "./components/ChatsScreen";

// Route-level code splitting: each page is loaded on demand rather than
// bundled into the initial JS chunk. This reduces the time-to-interactive
// on first load, especially on mobile connections.
const HomeScreen = lazy(() => import("./components/HomeScreen").then((m) => ({ default: m.HomeScreen })));
const CalendarScreen = lazy(() => import("./components/CalendarScreen").then((m) => ({ default: m.CalendarScreen })));
const CreateActivityScreen = lazy(() => import("./components/CreateActivityScreen").then((m) => ({ default: m.CreateActivityScreen })));
const ProfileScreen = lazy(() => import("./components/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const ActivityViewScreen = lazy(() => import("./components/ActivityViewScreen").then((m) => ({ default: m.ActivityViewScreen })));
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

// "Game" was renamed "activity" on 2026-11-03. Old /game/:id links (shared,
// bookmarked, in browser history) land here and are forwarded with any query
// string and hash intact. Production also 308s this path in vercel.json before
// the app loads; this route covers the dev server and in-app history.
function LegacyActivityRedirect() {
  const { id } = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={`/activity/${encodeURIComponent(id ?? "")}${search}${hash}`} replace />;
}

export const router = createBrowserRouter([
  {
    Component: AuthRoot,
    children: [
      { path: "/login", Component: Login },
      { path: "/signup", Component: Signup },
      { path: "/onboarding", Component: Onboarding },
      { path: "/game/:id", Component: LegacyActivityRedirect },
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: HomeScreen },
          { path: "calendar", Component: CalendarScreen },
          { path: "create", Component: CreateActivityScreen },
          { path: "chats", Component: ChatsScreen },
          { path: "profile", Component: ProfileScreen },
          { path: "activity/:id", Component: ActivityViewScreen },
        ],
      },
    ],
  },
]);
