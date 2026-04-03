const fs = require('fs');
let text = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

const stepCostsRegex = /function StepCosts\(\{.*?\}\) \{.*?return \(.*?</>\n\s*\);\n\s*\}/s;
const stepCostsReplacement = `function StepCosts({
  costType,
  setCostType,
  costAmount,
  setCostAmount,
  maxPlayers,
}: {
  costType: "free" | "per_person" | "fixed_total";
  setCostType: (val: "free" | "per_person" | "fixed_total") => void;
  costAmount: string;
  setCostAmount: (val: string) => void;
  maxPlayers: string;
}) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-5 leading-normal">
        Add any venue or equipment costs.
      </p>

      {/* Free / Per Player / Fixed Total chips */}
      <div className="mb-6">
        <h3 className="text-title-sm font-medium text-on-surface mb-3 leading-none">
          Cost Type
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Free", value: "free" },
            { label: "Per Player $", value: "per_person" },
            { label: "Fixed Total $", value: "fixed_total" },
          ].map((chip) => {
            const isActive = chip.value === costType;
            return (
              <button
                key={chip.value}
                onClick={() => {
                  setCostType(chip.value as any);
                  if (chip.value === "free") {
                    setCostAmount("");
                  }
                }}
                className={\`px-4 py-2 rounded-md3-full border text-label-lg font-medium transition-colors min-h-[32px] \${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container border-transparent"
                    : "bg-surface text-on-surface-variant border-outline"
                }\`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {costType !== "free" && (
        <OutlinedTextField
          label={costType === "per_person" ? "Cost per player" : "Total Venue Cost"}
          placeholder="0.00"
          value={costAmount}
          onChange={setCostAmount}
          prefix="$"
          type="text"
          inputMode="decimal"
        />
      )}

      {costType === "fixed_total" && parseFloat(costAmount || "0") > 0 && parseFloat(maxPlayers || "1") > 0 && (
        <div className="bg-primary-container rounded-md3-large p-5 mt-6 flex flex-col items-center gap-1">
          <span className="text-label-md text-on-primary-container leading-none">
            Estimated per person
          </span>
          <span className="text-headline-md font-medium text-on-primary-container leading-tight">
            \${(parseFloat(costAmount || "0") / parseFloat(maxPlayers || "1")).toFixed(2)}
          </span>
        </div>
      )}
    </>
  );
}`;

text = text.replace(stepCostsRegex, stepCostsReplacement);

const stepReviewPropsRegex = /interface StepReviewProps \{.*?\n\}/s;
const stepReviewPropsReplacement = `interface StepReviewProps {
  selectedSport: string;
  gameTitle: string;
  address: string;
  gameType: string;
  maxPlayers: string;
  timeOptions: TimeOption[];
  costType: "free" | "per_person" | "fixed_total";
  costAmount: string;
  description: string;
  isCustomLocation: boolean;
  gameCustomLocation: any;
  currentUser: any;
  handleSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}`;

text = text.replace(stepReviewPropsRegex, stepReviewPropsReplacement);

const stepReviewDefRegex = /export function StepReview\(\{.*?\}\s*:\s*StepReviewProps\)\s*\{/s;
const stepReviewDefReplacement = `export function StepReview({
  selectedSport,
  gameTitle,
  address,
  gameType,
  maxPlayers,
  timeOptions,
  costType,
  costAmount,
  description,
  isCustomLocation,
  gameCustomLocation,
  currentUser,
  handleSubmit,
  isSubmitting,
  error,
}: StepReviewProps) {`;

text = text.replace(stepReviewDefRegex, stepReviewDefReplacement);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', text);
