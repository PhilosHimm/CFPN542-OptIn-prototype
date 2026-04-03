const fs = require('fs');
let c = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

c = c.replace(/const \[totalCost, setTotalCost\] = useState.*?;\n\s*const \[splitCost, setSplitCost\].*?;/, 
`const [costType, setCostType] = useState<"free" | "per_person" | "fixed_total">(mock ? "fixed_total" : "free");
  const [costAmount, setCostAmount] = useState(mock ? "60" : "");`);

// Replace useMemo of perPersonCost
c = c.replace(/const perPersonCost = useMemo\(\(\) => \{[\s\S]*?\}, \[totalCost, splitCost, maxPlayers\]\);/, ``);

// In saveGame call
c = c.replace(/totalCost: parseFloat\(totalCost\) \|\| 0,/, `costType, costAmount: parseFloat(costAmount) || 0,`);

// In the dependency array of handleCreate
c = c.replace(/maxPlayers, totalCost, address,/, `maxPlayers, costAmount, costType, address,`);

// In StepInvite
c = c.replace(/totalCost=\{totalCost\}\s*splitCost=\{splitCost\}/g, `costType={costType} costAmount={costAmount}`);

// In StepCost Props
c = c.replace(/totalCost,\n\s*splitCost,/, `costType, costAmount, setCostType, setCostAmount,`);
// StepCost prop types
c = c.replace(/totalCost: string;\n\s*splitCost: boolean;/, `costType: "free" | "per_person" | "fixed_total"; costAmount: string; setCostType: (v: "free" | "per_person" | "fixed_total") => void; setCostAmount: (v: string) => void;`);

// Find the whole StepCost UI logic from `<OutlinedTextField` to `Cost Type`
let uiRegex = /\{\/\* Total Cost \*\/\}[\s\S]*?Cost Type[\s\S]*?<\/div>\n\s*<\/div>/;
c = c.replace(uiRegex, `{/* Cost Type */}\n        <div className="mb-6">\n          <h3 className="text-title-sm font-medium text-on-surface mb-3 leading-none">\n            Cost Type\n          </h3>\n          <div className="flex gap-2 flex-wrap">\n            {[\n              { label: "Free", value: "free" },\n              { label: "Per Player $", value: "per_person" },\n              { label: "Fixed Total $", value: "fixed_total" },\n            ].map((chip) => (\n              <button\n                key={chip.value}\n                onClick={() => {\n                  setCostType(chip.value as any);\n                  if (chip.value === "free") setCostAmount("");\n                }}\n                className={\`px-4 py-2 rounded-md3-full border text-label-lg font-medium transition-colors min-h-[32px] \${costType === chip.value ? "bg-secondary-container text-on-secondary-container border-transparent" : "bg-surface text-on-surface-variant border-outline"}\`}\n              >\n                {chip.label}\n              </button>\n            ))}\n          </div>\n        </div>\n\n        {/* Amount Input */}\n        {costType !== "free" && (\n          <OutlinedTextField\n            label={costType === "per_person" ? "Cost per Player" : "Total Venue Cost"}\n            placeholder="0.00"\n            value={costAmount}\n            onChange={setCostAmount}\n            prefix="$"\n            type="text"\n            inputMode="decimal"\n          />\n        )}`);

// StepReview Props
c = c.replace(/totalCost,\n\s*splitCost,/, `costType, costAmount,`);
c = c.replace(/totalCost: string;\n\s*splitCost: boolean;/, `costType: "free"| "per_person"|"fixed_total"; costAmount: string;`);
// StepReview UI
let revRegex = /\{\/\* Cost Section \*\/\}[\s\S]*?\{\/\* Visibility Section \*\/\}/;
c = c.replace(revRegex, `{/* Cost Section */}\n      <div className="mb-6 bg-surface p-4 rounded-xl border border-outline-variant">\n        <h3 className="text-title-md font-semibold text-on-surface mb-3 flex items-center gap-2">\n          <DollarSign className="w-5 h-5 text-primary" />\n          Cost\n        </h3>\n        {costType === "free" ? (\n          <p className="text-body-md text-on-surface-variant">Free game</p>\n        ) : (\n          <div className="space-y-3">\n            <ReviewRow\n              label={costType === "per_person" ? "Cost per Player" : "Total Venue Cost"}\n              value={costAmount ? \`$\${parseFloat(costAmount).toFixed(2)}\` : "—"}\n            />\n            <ReviewRow label="Type" value={costType === "per_person" ? "Per Person" : "Fixed Total split among players"} />\n          </div>\n        )}\n      </div>\n\n      {/* Visibility Section */}`);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', c);
