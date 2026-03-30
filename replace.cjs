const fs = require('fs');
const content = fs.readFileSync('src/app/components/ChatsScreen.tsx', 'utf8');

const regex = /const chatName = isGroup[\s\S]*?setIsSheetOpen\(false\);/;
const newValue = `const chatName = isGroup
      ? selectedChatUsers.map((u) => u.name.split(" ")[0]).join(", ")
      : selectedChatUsers[0].name;

    if (isDemo) {
      const newId = Date.now().toString();
      const newConvo: DemoConversation = {
        id: newId,
        type: isGroup ? "group" : "direct",
        name: chatName,
        initials: chatName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
        color: "#007AFF",
        lastMessage: "Chat started",
        lastMessageTime: "Just now",
        unread: 0,
        messages: [],
      };
      setDemoConvos((prev) => [newConvo, ...prev]);
      setActiveChatId(newId);
    } else {
      const participantIds = [profile.id, ...selectedChatUsers.map((u) => u.id)];
      createServiceConv(isGroup, chatName, participantIds).then((newId) => {
        if (newId) {
          const newSession: ChatSession = {
            id: newId,
            isGroup,
            name: chatName,
            initials: chatName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
            color: isGroup ? "#007AFF" : (selectedChatUsers[0].color ?? "#007AFF"),
            avatar: isGroup ? "" : (selectedChatUsers[0].avatar ?? ""),
            lastMessage: "Chat created",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            participants: participantIds,
            messages: [],
            unread: 0,
          };
          setChats((prev) => [newSession, ...prev]);
          setActiveChatId(newId);
        }
      });
    }

    setIsSheetOpen(false);`;

const newContent = content.replace(regex, newValue);
fs.writeFileSync('src/app/components/ChatsScreen.tsx', newContent);
console.log("Replaced!");
