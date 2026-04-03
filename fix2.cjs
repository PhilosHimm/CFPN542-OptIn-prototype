const fs = require('fs');

let code = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

// I need to find `function StepCosts` and `function StepInvite`
const stepCostsStart = code.lastIndexOf('function StepCosts({');
const stepCostsEnd = code.indexOf('function StepInvite({');

if (stepCostsStart !== -1 && stepCostsEnd !== -1) {
  code = code.substring(0, stepCostsStart) + `function StepCosts({
  maxPlayers,
  costType,
  setCostType,
  costAmount,
  setCostAmount,
  onNext,
}: {
  maxPlayers: string;
  costType: "free" | "per_person" | "fixed_total";
  setCostType: (v: "free" | "per_person" | "fixed_total") => void;
  costAmount: string;
  setCostAmount: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-5 leading-normal">
        Add any venue or equipment costs. Players can see the split.
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
        <div className="bg-primary-container rounded-md3-large p-5 mb-6 flex flex-col items-center gap-1">
          <span className="text-label-md text-on-primary-container leading-none">
            Estimated per person
          </span>
          <span className="text-headline-md font-medium text-on-primary-container leading-tight">
            \${(parseFloat(costAmount || "0") / parseFloat(maxPlayers || "1")).toFixed(2)}
          </span>
        </div>
      )}

      <button onClick={onNext} className="mt-8 w-full md3-btn md3-btn-primary">
        Next: Invite Players
      </button>
    </>
  );
}

// ─── STEP 4: Invite Players ────────────────────────────────\n` + code.substring(stepCostsEnd);
}

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', code);
