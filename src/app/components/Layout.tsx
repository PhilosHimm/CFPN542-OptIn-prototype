import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";

export function Layout() {
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
