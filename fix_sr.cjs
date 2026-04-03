const fs = require('fs');

let code = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

code = code.replace(
  /<ReviewRow\s*label="Total Cost"\s*value=\{[\s\S]*?\}\s*\/>\s*\{costAmount && parseFloat\(costAmount\) > 0 && \(\s*<>\s*\{costType === "fixed_total" && <ReviewRow label="Per Person Estimated" value=\{\`\$\$\{[\s\S]*?\}\`\} \/>\}\s*<\/>/,
  `<ReviewRow
            label={costType === "fixed_total" ? "Total Venue Cost" : costType === "per_person" ? "Cost per person" : "Cost"}
            value={costType === "free" ? "Free" : \`$\${parseFloat(costAmount || "0").toFixed(2)}\`}
          />
          {costType === "fixed_total" && parseFloat(costAmount || "0") > 0 && (
            <ReviewRow 
               label="Per Person Estimated" 
               value={\`$\${((parseFloat(costAmount || "0") / parseFloat(maxPlayers || "1")) || 0).toFixed(2)}\`} 
            />
          )}`
);

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', code);
