const fs = require("fs");
const file = "src/app/components/GameViewScreen.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  `  // User vote state: { optionId -> "in" | "maybe" | "out" }`,
  `  const handleProposeSubmit = async () => {
    if (!id || !formDate || !formStart || !formEnd) return;
    const ok = await addGameOption(id, {
      date: formDate,
      start_time: formStart,
      end_time: formEnd,
      location: formLocation || game?.location,
    });
    if (ok) {
      toast.success("New time option added");
      setShowProposeTime(false);
      refreshGame();
    } else {
      toast.error("Failed to add time option");
    }
  };

  const handleEditSubmit = async () => {
    if (!showEditTime || !formDate || !formStart || !formEnd) return;
    const ok = await updateGameOption(showEditTime.id, {
      date: formDate,
      start_time: formStart,
      end_time: formEnd,
      location: formLocation,
    });
    if (ok) {
      toast.success("Time option updated");
      setShowEditTime(null);
      refreshGame();
    } else {
      toast.error("Failed to update time option");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    const ok = await deleteGameOption(optionId);
    if (ok) {
      toast.success("Time option deleted");
      setShowEditTime(null);
      refreshGame();
    } else {
      toast.error("Failed to delete time option");
    }
  };

  const handleDeadlineSubmit = async () => {
    if (!id || !deadlineDate) return;
    const dt = new Date(deadlineDate);
    dt.setHours(23, 59, 59, 999); // end of day or something, simplistic for now
    const ok = await updateGameVotingDeadline(id, dt.toISOString());
    if (ok) {
      toast.success("Voting deadline updated");
      setShowDeadline(false);
      refreshGame();
    } else {
      toast.error("Failed to update deadline");
    }
  };

  const handleCancelGame = async () => {
    if (!id) return;
    const ok = await cancelGame(id);
    if (ok) {
      toast.success("Game cancelled");
      setShowHostMenu(false);
      refreshGame();
    } else {
      toast.error("Failed to cancel game");
    }
  };

  const openEditOption = (opt: VoteOption) => {
    setFormDate(opt.date);
    setFormStart(opt.startTime);
    setFormEnd(opt.endTime);
    setFormLocation(opt.location);
    setShowEditTime({ id: opt.id });
  };

  // User vote state: { optionId -> "in" | "maybe" | "out" }`
);

fs.writeFileSync(file, code);
console.log("Replaced handlers");
