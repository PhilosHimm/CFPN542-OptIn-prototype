import { Signal, Wifi, BatteryFull } from "lucide-react";

export function StatusBar() {
  return (
    <div className="flex justify-between items-center px-6 py-4 sticky top-0 z-50 bg-transparent backdrop-blur-sm">
      <span className="text-label-lg font-semibold">
        9:41
      </span>
      {/* Dynamic Island Inspired Shape */}
      <div className="absolute left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-[20px] shadow-lg flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full absolute right-4" />
      </div>
      <div className="flex items-center gap-2">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <BatteryFull className="w-5 h-5" />
      </div>
    </div>
  );
}
