const fs = require("fs");
const file = "src/app/components/GameViewScreen.tsx";
let code = fs.readFileSync(file, "utf8");

const hostMenu = `
      {/* Host Menu Modal */}
      <AnimatePresence>
        {showHostMenu && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHostMenu(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-md3-extra-large p-4 pb-8 z-50 flex flex-col gap-2 shadow-md3-5"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="w-10 h-1.5 bg-outline-variant rounded-full mx-auto mb-4" />
              <h2 className="text-title-lg font-medium text-on-surface mb-2 px-2">
                Host Options
              </h2>

              <button
                onClick={() => {
                  setShowHostMenu(false);
                  if (game?.timeOptions[0]) {
                    openEditOption(game.timeOptions[0]);
                  } else {
                    toast.error("No options to edit");
                  }
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-surface-container rounded-md3-medium text-left transition-colors"
              >
                <Edit3 className="w-6 h-6 text-on-surface-variant flex-shrink-0" />
                <div>
                  <div className="text-body-lg text-on-surface font-medium">
                    Edit Time Options
                  </div>
                  <div className="text-body-md text-on-surface-variant">
                    Change names, dates, or times of polls
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowHostMenu(false);
                  setDeadlineDate(game.votingDeadline.split("T")[0] || "");
                  setShowDeadline(true);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-surface-container rounded-md3-medium text-left transition-colors"
              >
                <Timer className="w-6 h-6 text-on-surface-variant flex-shrink-0" />
                <div>
                  <div className="text-body-lg text-on-surface font-medium">
                    Change Voting Deadline
                  </div>
                  <div className="text-body-md text-on-surface-variant">
                    Extend or shorten the voting phase
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  const confirm = window.confirm("Are you sure you want to cancel this game?");
                  if (confirm) {
                    handleCancelGame();
                  }
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-error-container rounded-md3-medium text-left transition-colors mt-2"
              >
                <Ban className="w-6 h-6 text-error flex-shrink-0" />
                <div>
                  <div className="text-body-lg text-error font-medium">
                    Cancel Game
                  </div>
                  <div className="text-body-md text-error/80">
                    Permanently delete this game event
                  </div>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
`;

const modals = `
      {/* Propose Time Modal */}
      <AnimatePresence>
        {showProposeTime && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProposeTime(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-md3-extra-large p-4 pb-8 z-50 flex flex-col gap-4 shadow-md3-5"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="w-10 h-1.5 bg-outline-variant rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <h2 className="text-title-lg font-medium text-on-surface">Propose New Time</h2>
                <button onClick={() => setShowProposeTime(false)} className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Date</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">Start Time</label>
                    <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                  </div>
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">End Time</label>
                    <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                  </div>
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Location</label>
                  <input type="text" placeholder="e.g. Center Court" value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                </div>
                <button onClick={handleProposeSubmit} className="w-full bg-primary text-on-primary rounded-md3-full py-3 h-[52px] text-label-lg font-medium mt-2">
                  Add Option
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Time Option Modal */}
      <AnimatePresence>
        {showEditTime && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditTime(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-md3-extra-large p-4 pb-8 z-50 flex flex-col gap-4 shadow-md3-5"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="w-10 h-1.5 bg-outline-variant rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <h2 className="text-title-lg font-medium text-on-surface">Edit Time Option</h2>
                <button onClick={() => setShowEditTime(null)} className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Date</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">Start Time</label>
                    <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                  </div>
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">End Time</label>
                    <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                  </div>
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Location</label>
                  <input type="text" placeholder="e.g. Center Court" value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleDeleteOption(showEditTime.id)} className="flex-1 border-2 border-error text-error rounded-md3-full py-3 h-[52px] text-label-lg font-medium">
                    Delete
                  </button>
                  <button onClick={handleEditSubmit} className="flex-1 bg-primary text-on-primary rounded-md3-full py-3 h-[52px] text-label-lg font-medium">
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Change Deadline Modal */}
      <AnimatePresence>
        {showDeadline && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeadline(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-md3-extra-large p-4 pb-8 z-50 flex flex-col gap-4 shadow-md3-5"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="w-10 h-1.5 bg-outline-variant rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <h2 className="text-title-lg font-medium text-on-surface">Change Voting Deadline</h2>
                <button onClick={() => setShowDeadline(false)} className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Voting Deadline Date</label>
                  <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="w-full bg-surface-container rounded-md3-medium px-4 py-3 text-body-lg text-on-surface" />
                </div>
                <button onClick={handleDeadlineSubmit} className="w-full bg-primary text-on-primary rounded-md3-full py-3 h-[52px] text-label-lg font-medium mt-2">
                  Update Deadline
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
`;

// Extract everything up to the final '</div>\n    </div>\n  );\n}'
// To be safe, we'll replace the exact tail of the string.

// First we remove any `Host Menu Modal` and its AnimatePresence if it exists.
// Since we reverted, it's just `</div>\n    </div>\n  );\n}`
const target = `      </div>\n    </div>\n  );\n}`;
const replacement = `      </div>\n${hostMenu}\n${modals}\n    </div>\n  );\n}`;

const newCode = code.replace(target, replacement);

if (newCode !== code) {
  fs.writeFileSync(file, newCode);
  console.log("Success");
} else {
  // Let's try matching with CRLF
  const targetCRLF = `      </div>\r\n    </div>\r\n  );\r\n}`;
  const replacementCRLF = `      </div>\n${hostMenu}\n${modals}\n    </div>\n  );\n}`;
  const newCodeCRLF = code.replace(targetCRLF, replacementCRLF);
  if (newCodeCRLF !== code) {
    fs.writeFileSync(file, newCodeCRLF);
    console.log("Success CRLF");
  } else {
    // Let's just find the last indexOf("</div>") 
    const idx1 = code.lastIndexOf("</div>");
    const idx2 = code.lastIndexOf("</div>", idx1 - 1);
    if (idx2 > 0) {
      code = code.substring(0, idx1) + "\n" + hostMenu + "\n" + modals + "\n" + code.substring(idx1);
      fs.writeFileSync(file, code);
      console.log("Success Index");
    } else {
      console.log("Failure to replace");
    }
  }
}
