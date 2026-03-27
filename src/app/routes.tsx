import { createBrowserRouter, Outlet } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { HomeScreen } from "./components/HomeScreen";
import { CalendarScreen } from "./components/CalendarScreen";
import { CreateGameScreen } from "./components/CreateGameScreen";
import { ChatsScreen } from "./components/ChatsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { GameViewScreen } from "./components/GameViewScreen";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Onboarding } from "./pages/Onboarding";

// Wraps all routes inside AuthProvider so context identity is always
// co-located with its consumers — prevents stale module issues on HMR.
function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
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
