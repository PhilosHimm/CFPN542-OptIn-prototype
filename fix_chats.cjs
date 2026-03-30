const fs = require('fs');
const content = fs.readFileSync('src/app/components/ChatsScreen.tsx', 'utf8');

const regex = /createServiceConv\(isGroup, chatName, participantIds\)\.then\(\(newId\) => \{[\s\S]*?\}\);/;
const newValue = `createServiceConv(isGroup, chatName, participantIds).then((newId) => {
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
          } else {
            console.error("Failed to create conversation");
            setComposerFeedback("Failed to start chat.");
          }
        });`;

const newContent = content.replace(regex, newValue);
fs.writeFileSync('src/app/components/ChatsScreen.tsx', newContent);
console.log("Fixed ChatsScreen creation block!");
