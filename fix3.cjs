const fs = require('fs');
let code = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

const brokenPropsStar = code.indexOf('}: {'); // where the error starts
// Let's just do a clean replace using regex for StepInvite
const stepInviteRegex = /function StepInvite\(\{[\s\S]*?\}\) \{/;
code = code.replace(stepInviteRegex, `function StepInvite({
  searchQuery,
  setSearchQuery,
  filteredPlayers,
  selectedPlayers,
  togglePlayer,
  allSelected,
  toggleSelectAll,
  linkCopied,
  handleCopyLink,
  onNext,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filteredPlayers: InvitePlayer[];
  selectedPlayers: string[];
  togglePlayer: (id: string) => void;
  allSelected: boolean;
  toggleSelectAll: () => void;
  linkCopied: boolean;
  handleCopyLink: () => void;
  onNext: () => void;
}) {`);

// BUT since it's fundamentally broken, there's no `function StepInvite({` anymore! 
