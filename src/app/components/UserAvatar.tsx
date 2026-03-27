interface UserAvatarProps {
  name: string;
  color?: string;
  avatarUrl?: string | null;
  /** Tailwind text size class for the initials, e.g. "text-label-lg" */
  textClassName?: string;
  className?: string;
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export function UserAvatar({
  name,
  color = "#3B82F6",
  avatarUrl,
  textClassName = "text-label-lg",
  className = "",
}: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
      style={{ backgroundColor: color }}
    >
      <span className={`font-medium text-white select-none ${textClassName}`}>
        {getInitials(name)}
      </span>
    </div>
  );
}
