const fs = require('fs');
let code = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

// 1. replace state
code = code.replace(
  /const \[totalCost, setTotalCost\] = useState\(""\);\s*const \[splitCost, setSplitCost\] = useState\(false\);/,
  `const [costType, setCostType] = useState<"free" | "per_person" | "fixed_total">("free");
  const [costAmount, setCostAmount] = useState("");`
);

// 2. step validation
code = code.replace(
  /const isStep3Valid = true;/,
  `const isStep3Valid = costType === "free" ? true : parseFloat(costAmount) > 0;`
);

// 3. StepCosts usage
code = code.replace(
  /<StepCosts\s*totalCost=\{totalCost\}\s*setTotalCost=\{setTotalCost\}\s*splitCost=\{splitCost\}\s*setSplitCost=\{setSplitCost\}\s*onNext=\{goNext\}\s*\/>/s,
  `<StepCosts
                maxPlayers={maxPlayers}
                costType={costType}
                setCostType={setCostType}
                costAmount={costAmount}
                setCostAmount={setCostAmount}
                onNext={goNext}
              />`
);

// 4. StepReview usage
code = code.replace(
  /totalCost=\{totalCost\}\s*splitCost=\{splitCost\}\s*perPersonCost=\{perPersonCost\}/s,
  `costType={costType}
                costAmount={costAmount}`
);

// 5. Submit mapping
code = code.replace(
  /totalCost: parseFloat\(totalCost \|\| "0"\),\s*splitCost,/,
  `costType,
      costAmount: parseFloat(costAmount || "0"),`
);

// 6. perPersonCost memo
code = code.replace(
  /const perPersonCost = useMemo\(\(\) => \{[\s\S]*?\}, \[totalCost, splitCost, maxPlayers\]\);/s,
  ``
);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', code);
