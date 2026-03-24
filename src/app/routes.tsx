import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomeScreen } from "./components/HomeScreen";
import { CalendarScreen } from "./components/CalendarScreen";
import { CreateGameScreen } from "./components/CreateGameScreen";
import { ChatsScreen } from "./components/ChatsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { GameViewScreen } from "./components/GameViewScreen";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
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
]);
