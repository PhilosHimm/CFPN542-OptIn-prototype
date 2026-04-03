const fs = require('fs');
let c = fs.readFileSync('src/app/components/GameViewScreen.tsx', 'utf8');

c = c.replace(/\{\s*\/\* Cost Breakdown \*\/\}[\s\S]*?\}\)/, 
`{/* Cost Breakdown */}
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
        )}`);

// There's another game.totalCost usage in GameViewScreen. Let's find it.
c = c.replace(/\{game\.totalCost > 0 && \(/, `{game.costType !== "free" && (`);

// There's another `${game.totalCost.toFixed(2)}` maybe? Let's check:
c = c.replace(/game\.totalCost\b/g, `game.costAmount`);
c = c.replace(/game\.splitCost\b/g, `game.costType === "fixed_total"`);

fs.writeFileSync('src/app/components/GameViewScreen.tsx', c);
