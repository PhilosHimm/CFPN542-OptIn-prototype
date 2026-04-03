const fs = require('fs');
let c = fs.readFileSync('src/app/components/GameViewScreen.tsx', 'utf8');

c = c.replace(/const perPersonCost = useMemo\(\(\) => \{([\s\S]*?)\}, \[game\]\);/, 
  `const perPersonCost = useMemo(() => {
    if (!game || game.costType === "free") return "Free";
    if (game.costType === "per_person") return \`$\${game.costAmount.toFixed(2)}\`;
    const confirmed =
      game.status === "confirmed" && game.confirmedOptionId
        ? game.timeOptions
            .find((o) => o.id === game.confirmedOptionId)
            ?.votes.in.length || 1
        : game.roster.length || 1;
    return \`$\${(game.costAmount / confirmed).toFixed(2)}\`;
  }, [game]);`);

let oldCostUI = `{/* Cost Breakdown */}`;
let endIndex = c.indexOf(`{/* Host Settings Menu Bottom Sheet (Task 7 — status-conditional) */}`);
if (endIndex === -1) {
  console.log("Could not find Host Settings marker");
  process.exit(1);
}
let startIndex = c.lastIndexOf(`{/* Cost Breakdown */}`, endIndex);

let newCostUI = `{/* Cost Breakdown */}
        {game.costType !== "free" && (
          <div className="bg-surface-container-lowest rounded-md3-large p-4 shadow-md3-1 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-body-md font-medium text-on-surface leading-none">
                Cost Breakdown
              </h3>
            </div>
            {/* Task 10: cost-split warning when no confirmed attendees */}
            {game.status === "confirmed" && game.roster.length === 0 && game.costType === "fixed_total" && (
              <div className="flex items-center gap-2 bg-error-container rounded-xl px-3 py-2 mb-3">
                <CircleAlert className="w-4 h-4 text-on-error-container shrink-0" />
                <p className="text-body-sm text-on-error-container">
                  No confirmed attendees — cost split unavailable
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-label-lg text-on-surface-variant leading-normal">
                  {game.costType === "per_person" ? "Cost per Player" : "Total Venue Cost"}
                </span>
                <span className="text-body-md text-on-surface font-medium leading-normal">
                  \${game.costAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-lg text-on-surface-variant leading-normal">
                  Cost Target
                </span>
                <span className="text-body-md text-on-surface leading-normal">
                  {game.costType === "fixed_total" ? "Split Equally" : "Per Player"}
                </span>
              </div>
              {game.costType === "fixed_total" && (
                <div className="border-t border-outline-variant/50 pt-2 mt-1 flex justify-between">
                  <span className="text-body-md text-primary font-medium leading-normal">
                    Per Person ({game.roster.length || 1} {game.roster.length === 1 ? "player" : "players"})
                  </span>
                  <span className="text-title-md text-primary font-medium leading-normal">
                    {game.roster.length === 0 ? "—" : perPersonCost}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        `;

c = c.substring(0, startIndex) + newCostUI + c.substring(endIndex);

// There is one more use of totalCost in game view: wait, let's just search and replace:
c = c.replace(/\{game\.totalCost > 0 && \(/g, `{game.costType !== "free" && (`);

// Are there any `game.totalCost` remaining in GameViewScreen? Let's fix them:
c = c.replace(/game\.totalCost/g, `game.costAmount`);
c = c.replace(/game\.splitCost/g, `game.costType === "fixed_total"`);

fs.writeFileSync('src/app/components/GameViewScreen.tsx', c);
