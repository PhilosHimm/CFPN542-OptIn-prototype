const fs = require('fs');
let c = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

c = c.replace(/interface StepCostsProps \{[\s\S]*?onNext: \(\) => void;\n\}/, 
`interface StepCostsProps {
  maxPlayers: string;
  costType: "free" | "per_person" | "fixed_total";
  costAmount: string;
  setCostType: (v: "free" | "per_person" | "fixed_total") => void;
  setCostAmount: (v: string) => void;
  onNext: () => void;
}`);

c = c.replace(/function StepCosts\(\{.*?\}\: StepCostsProps\) \{/s, 
`function StepCosts({ maxPlayers, costType, costAmount, setCostType, setCostAmount, onNext }: StepCostsProps) {`);

c = c.replace(/interface StepReviewProps \{[\s\S]*?error: string \| null;\n  onBack: \(\) => void;\n\}/,
`interface StepReviewProps {
  selectedSport: string;
  gameTitle: string;
  address: string;
  gameType: string;
  maxPlayers: string;
  timeOptions: TimeOption[];
  costType: "free" | "per_person" | "fixed_total";
  costAmount: string;
  selectedPlayers: string[];
  invitePlayers: InvitePlayer[];
  groups: { id: string; name: string }[];
  visibility: string;
  setVisibility: (v: "public" | "group" | "private" | "") => void;
  assignedGroup: string;
  setAssignedGroup: (v: string) => void;
  votingPeriodType: number | "custom";
  setVotingPeriodType: (v: number | "custom") => void;
  customVotingHours: string;
  setCustomVotingHours: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
  onBack: () => void;
}`);

c = c.replace(/function StepReview\(\{[\s\S]*?\}\: StepReviewProps\) \{/s,
`function StepReview({
  selectedSport,
  gameTitle,
  address,
  gameType,
  maxPlayers,
  timeOptions,
  costType,
  costAmount,
  selectedPlayers,
  invitePlayers,
  groups,
  visibility,
  setVisibility,
  assignedGroup,
  setAssignedGroup,
  votingPeriodType,
  setVotingPeriodType,
  customVotingHours,
  setCustomVotingHours,
  onSubmit,
  error,
  onBack,
}: StepReviewProps) {`);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', c);
