const fs = require('fs');
let c = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

c = c.replace(/const \[totalCost, setTotalCost\] = useState\(mock \? "60" : ""\);\s*const \[splitCost, setSplitCost\] = useState\(true\);/, 
`const [costType, setCostType] = useState<"free" | "per_person" | "fixed_total">(mock ? "fixed_total" : "free");
    const [costAmount, setCostAmount] = useState(mock ? "60" : "");`);

c = c.replace(/const perPersonCost = useMemo\(\(\) => \{[\s\S]*?\}, \[totalCost, splitCost, maxPlayers\]\);/, '');

c = c.replace(/totalCost: parseFloat\(totalCost\) \|\| 0,/,
  `costType,\n        costAmount: parseFloat(costAmount) || 0,`);

c = c.replace(/totalCost=\{totalCost\}\s*splitCost=\{splitCost\}/g, `costType={costType}\n                costAmount={costAmount}`);

c = c.replace(/totalCost,\n\s*splitCost,/g, `costType,\n  costAmount,`);

c = c.replace(/totalCost: string;\n\s*splitCost: boolean;/g, `costType: "free" | "per_person" | "fixed_total";\n  costAmount: string;`);

c = c.replace(/\[navigate, gameTitle, effectiveSport, gameType, maxPlayers, totalCost,[^\]]+]/,
  `[navigate, gameTitle, effectiveSport, gameType, maxPlayers, costType, costAmount, address, assignedGroup, visibility, profile, user, timeOptions, selectedPlayers, votingPeriodType, customVotingHours]`);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', c);
