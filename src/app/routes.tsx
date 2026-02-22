import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Calendar } from "./pages/Calendar";
import { CreateGame } from "./pages/CreateGame";
import { Messages } from "./pages/Messages";
import { Profile } from "./pages/Profile";
import { GamePage } from "./pages/GamePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "calendar", Component: Calendar },
      { path: "create", Component: CreateGame },
      { path: "messages", Component: Messages },
      { path: "profile", Component: Profile },
      { path: "game/:id", Component: GamePage },
    ],
  },
]);