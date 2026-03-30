const fs = require('fs');
const content = fs.readFileSync('src/app/components/ChatView.tsx', 'utf8');

const regex = /messages\.map\(\(msg\) => \([\s\S]*?\)\}/;
const newValue = `messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))
        )}`;

const newContent = content.replace(regex, newValue);
fs.writeFileSync('src/app/components/ChatView.tsx', newContent);
console.log("Replaced ChatView!");
