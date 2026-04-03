const fs = require('fs');
let c = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

c = c.replace(/totalCost,\n\s*splitCost,\n\s*perPersonCost,/, `costType,\n    costAmount,`);
c = c.replace(/totalCost: string;\n\s*splitCost: boolean;\n\s*perPersonCost: string;/, `costType: "free" | "per_person" | "fixed_total";\n    costAmount: string;`);
c = c.replace(/totalCost && parseFloat\(totalCost\) > 0/, `costType !== "free"`);
c = c.replace(/parseFloat\(totalCost\)\.toFixed\(2\)/g, `parseFloat(costAmount).toFixed(2)`);
c = c.replace(/\{totalCost && parseFloat\(totalCost\)/g, `{costType !== "free" && parseFloat(costAmount)`);
c = c.replace(/totalCost=\{totalCost\}/g, `costAmount={costAmount}`);
c = c.replace(/splitCost=\{splitCost\}/g, `costType={costType}`);
c = c.replace(/perPersonCost={perPersonCost}/g, ``);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', c);
