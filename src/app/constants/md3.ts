// ── Material Design 3 Design Tokens ─────────────────────────────────────────

export const M3 = {
  // Primary (Blue)
  primary: "#0061A4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#CFE5FF",
  onPrimaryContainer: "#001D35",

  // Secondary — Green (used for Confirmed status)
  secondary: "#006C4F",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#89F8CC",
  onSecondaryContainer: "#002114",

  // Tertiary — Amber (used for Proposal / Voting status)
  tertiary: "#815400",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FFDDB3",
  onTertiaryContainer: "#291800",

  // Error — Red (Cancelled / Out vote)
  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",

  // Background / Surface
  background: "#F8FBFF",
  onBackground: "#191C20",
  surface: "#F8FBFF",
  onSurface: "#191C20",

  // Surface Variant
  surfaceVariant: "#DDE3EA",
  onSurfaceVariant: "#41484D",

  // Surface Containers (from lowest to highest tonal elevation)
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F1F3FA",
  surfaceContainer: "#E5E8EE",
  surfaceContainerHigh: "#DFE1E8",
  surfaceContainerHighest: "#D9DCE3",

  // Outline
  outline: "#71787E",
  outlineVariant: "#C1C7CE",

  // Inverse
  inverseSurface: "#2E3135",
  inverseOnSurface: "#EFF0F7",
  inversePrimary: "#9DCBFF",

  // Scrim
  scrim: "#000000",
} as const;

// ── Shape (corner radius) ───────────────────────────────────────────────────
export const Shape = {
  none: "0px",
  extraSmall: "4px",
  small: "8px",
  medium: "12px",
  large: "16px",
  extraLarge: "28px",
  full: "9999px",
} as const;

// ── Elevation shadows ────────────────────────────────────────────────────────
export const Elevation = {
  level0: "none",
  level1: "0px 1px 2px rgba(0,97,164,0.25), 0px 1px 3px rgba(0,97,164,0.12)",
  level2: "0px 1px 2px rgba(0,97,164,0.3), 0px 2px 6px rgba(0,97,164,0.15)",
  level3: "0px 4px 8px rgba(0,97,164,0.2), 0px 1px 3px rgba(0,97,164,0.15)",
} as const;

// ── Activity status helpers ──────────────────────────────────────────────────────
export type ActivityStatus = "proposal" | "confirmed" | "completed" | "cancelled";

export const statusConfig: Record<ActivityStatus, { bg: string; text: string; label: string; dotColor: string }> = {
  proposal:  { bg: M3.tertiaryContainer,  text: M3.tertiary,   label: "Voting Open", dotColor: M3.tertiary  },
  confirmed: { bg: M3.secondaryContainer, text: M3.secondary,  label: "Confirmed",   dotColor: M3.secondary },
  completed: { bg: M3.surfaceVariant,     text: M3.onSurfaceVariant, label: "Completed", dotColor: M3.onSurfaceVariant },
  cancelled: { bg: M3.errorContainer,    text: M3.error,      label: "Cancelled",   dotColor: M3.error     },
};
