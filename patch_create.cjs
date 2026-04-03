const fs = require('fs');
let c = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

c = c.replace(/const \[totalCost, setTotalCost\] = useState\(mock \? "60" : ""\);\n\s*const \[splitCost, setSplitCost\] = useState\(true\);/,
  `const [costType, setCostType] = useState<"free" | "per_person" | "fixed_total">(mock ? "fixed_total" : "free");\n    const [costAmount, setCostAmount] = useState(mock ? "60" : "");`);

// Modify derived perPersonCost - actually we can just remove perPersonCost derived since it's going away or being shown differently.
c = c.replace(/const perPersonCost = useMemo\(\(\) => \{[\s\S]*?\}, \[totalCost, splitCost, maxPlayers\]\);/,
  ``); // eliminate original perPersonCost

c = c.replace(/totalCost: parseFloat\(totalCost\) \|\| 0,/,
  `costType,\n        costAmount: parseFloat(costAmount) || 0,`);

c = c.replace(/totalCost, splitCost,/g, `costType, costAmount,`);
c = c.replace(/totalCost: string;\n\s*splitCost: boolean;/, `costType: "free"| "per_person" | "fixed_total"; costAmount: string;`);
c = c.replace(/totalCost=\{totalCost\}\n\s*splitCost=\{splitCost\}/g, `costType={costType} costAmount={costAmount}`);

c = c.replace(/\{splitCost \? "Split equally" : "No split — full amount shown"\}/, `{costType === "per_person" ? "Per player cost" : "Fixed total for venue"}`);
c = c.replace(/\$\{perPersonCost\}/, `\${costType === "free" ? "0.00" : costType === "per_person" ? parseFloat(costAmount || "0").toFixed(2) : (parseFloat(costAmount || "0") / (parseFloat(maxPlayers) || 1)).toFixed(2)}`);

c = c.replace(/\[navigate, gameTitle, effectiveSport, gameType, maxPlayers, totalCost, address, assignedGroup, visibility, profile, user, timeOptions, selectedPlayers, votingPeriodType, customVotingHours\]/,
  `[navigate, gameTitle, effectiveSport, gameType, maxPlayers, costType, costAmount, address, assignedGroup, visibility, profile, user, timeOptions, selectedPlayers, votingPeriodType, customVotingHours]`);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', c);
