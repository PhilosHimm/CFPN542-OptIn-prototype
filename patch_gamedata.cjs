const fs = require('fs');
let c = fs.readFileSync('src/app/components/gameData.ts', 'utf8');

c = c.replace(/totalCost: number;\s*splitCost: boolean;/, `costType: "free" | "per_person" | "fixed_total";\n    costAmount: number;`);

c = c.replace(/totalCost: g.total_cost \|\| 0,\s*splitCost: \(g\.total_cost \|\| 0\) > 0,/,
  `costType: g.total_cost > 0 ? "fixed_total" : (g.per_person_cost > 0 ? "per_person" : "free"),\n      costAmount: g.total_cost > 0 ? g.total_cost : (g.per_person_cost || 0),`);

c = c.replace(/totalCost: 0, splitCost: false/g, 'costType: "free", costAmount: 0');
c = c.replace(/totalCost: ([0-9]+), splitCost: true/g, 'costType: "fixed_total", costAmount: $1');
c = c.replace(/totalCost: ([0-9]+), splitCost: false/g, 'costType: "per_person", costAmount: $1');

c = c.replace(/totalCost: number;\s*location: string;\s*groupId: string;\s*visibility: string;\s*createdBy: string;/,
  `costType: "free" | "per_person" | "fixed_total";\n    costAmount: number;\n    location: string;\n    groupId: string;\n    visibility: string;\n    createdBy: string;`);

c = c.replace(/const perPersonCost = input.totalCost > 0[\s\S]*?\: 0;/,
  `let total_cost = 0;
    let per_person_cost = 0;
    if (input.costType === "fixed_total") {
      total_cost = input.costAmount;
    } else if (input.costType === "per_person") {
      per_person_cost = input.costAmount;
    }`);

c = c.replace(/total_cost: input.totalCost,\s*per_person_cost: perPersonCost,/,
  `total_cost,\n        per_person_cost,`);

fs.writeFileSync('src/app/components/gameData.ts', c);
