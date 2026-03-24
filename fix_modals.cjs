const fs = require("fs");
const file = "src/app/components/GameViewScreen.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(/    <\/div>\r?\n  \);\r?\n}/, [
'      {/* Propose Time Modal */}...',
'    </div>',
'  );',
'}'
].join("\n")); // This is just a test

// Actual implementation
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

let code2 = fs.readFileSync(file, "utf8");
code2 = code2.replace(/    <\/div>\r?\n  \);\r?\n}/, "\n" + modals + "\n    </div>\n  );\n}");
fs.writeFileSync(file, code2);
