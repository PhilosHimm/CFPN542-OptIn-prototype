import { MapPin, Clock, Users, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router";

interface GameCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  players: string;
  isFull: boolean;
  variant: "vote" | "confirmed" | "completed";
}

export function GameCard({
  id,
  title,
  date,
  time,
  location,
  players,
  isFull,
  variant,
}: GameCardProps) {
  const navigate = useNavigate();

  const statusConfig = {
    vote: {
      label: "Voting Phase",
      chipBg: "bg-tertiary-container",
      chipText: "text-on-tertiary-container",
    },
    confirmed: {
      label: "Confirmed",
      chipBg: "bg-secondary-container",
      chipText: "text-on-secondary-container",
    },
    completed: {
      label: "Completed",
      chipBg: "bg-surface-variant",
      chipText: "text-on-surface-variant",
    },
  }[variant];

  return (
    <button
      onClick={() => navigate(`/game/${id}`)}
      className="w-full text-left bg-surface rounded-md3-medium p-4 shadow-md3-1 active:scale-[0.98] transition-transform border border-outline-variant"
    >
      {/* Status chip */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-md3-small text-label-md font-medium ${statusConfig.chipBg} ${statusConfig.chipText}`}
        >
          {statusConfig.label}
        </span>
        <span className="text-label-md text-on-surface-variant">
          {variant === "completed" ? "Past" : isFull ? "Full" : "Open"}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-title-md font-medium text-on-surface mb-2 leading-tight">
        {title}
      </h3>

      {/* Details */}
      <div className="flex flex-col gap-1.5 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-on-surface-variant" />
          <span className="text-body-md text-on-surface-variant">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-on-surface-variant" />
          <span className="text-body-md text-on-surface-variant">{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-on-surface-variant" />
          <span className="text-body-md text-on-surface-variant">{location}</span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-on-surface-variant" />
          <span
            className={`text-label-lg font-medium ${
              isFull ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            {players} players
          </span>
        </div>
        {variant === "vote" ? (
          <span className="px-6 py-2.5 bg-primary text-on-primary rounded-md3-full text-label-lg font-medium shadow-md3-1">
            Vote Now
          </span>
        ) : variant === "confirmed" ? (
          <span className="px-6 py-2.5 bg-secondary-container text-on-secondary-container rounded-md3-full text-label-lg font-medium">
            View Details
          </span>
        ) : (
          <span className="px-6 py-2.5 bg-surface-variant text-on-surface-variant rounded-md3-full text-label-lg font-medium">
            View Recap
          </span>
        )}
      </div>
    </button>
  );
}
