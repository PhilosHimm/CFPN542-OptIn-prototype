import { 
  Circle,
  Activity,
  Gamepad2,
  Dribbble,
  Volleyball,
  Trophy,
  Target
} from "lucide-react";

/** Helper to map sports to icons */
export function SportIcon({ sport, className = "w-6 h-6" }: { sport: string; className?: string }) {
  const s = sport.toLowerCase();
  if (s.includes("basketball")) return <Dribbble className={className} />;
  if (s.includes("soccer") || s.includes("football")) return <Circle className={className} />;
  if (s.includes("volleyball")) return <Circle className={className} />;
  if (s.includes("tennis") || s.includes("pickleball")) return <Target className={className} />;
  if (s.includes("baseball") || s.includes("softball")) return <Activity className={className} />;
  if (s.includes("hockey")) return <Activity className={className} />;
  return <Gamepad2 className={className} />;
}
