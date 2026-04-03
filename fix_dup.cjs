const fs = require('fs');

let c = fs.readFileSync('src/app/components/CreateGameScreen.tsx', 'utf8');

c = c.replace(/Trash2,/, 'Trash2,\n  Copy,');

c = c.replace(/const removeTimeOption = useCallback\(\(id: string\) => \{\r?\n\s*setTimeOptions\(\(prev\) => prev\.filter\(\(o\) => o\.id !== id\)\);\r?\n\s*\}, \[\]\);/, `const removeTimeOption = useCallback((id: string) => {
    setTimeOptions((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const duplicateTimeOption = useCallback((id: string) => {
    setTimeOptions((prev) => {
      if (prev.length >= 5) return prev;
      const t = prev.find((o) => o.id === id);
      if (!t) return prev;
      
      const newOption = {
        ...t,
        id: String(Date.now()),
      };
      
      const index = prev.findIndex(o => o.id === id);
      const newArr = [...prev];
      newArr.splice(index + 1, 0, newOption);
      return newArr;
    });
  }, []);`);

const replaceStr = `className="text-body-md font-medium text-primary leading-none">
              Option {index + 1}
            </span>
            <div className="flex items-center gap-1 -mr-2 -mt-1">
              {timeOptions.length < 5 && (
                <button
                  aria-label="Duplicate"
                  title="Duplicate Option"
                  onClick={() => onDuplicate(option.id)}
                  className="w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center text-primary bg-transparent hover:bg-surface-variant transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
              )}
              {timeOptions.length > 1 && (
                <button
                  aria-label="Remove"
                  title="Remove Option"
                  onClick={() => onRemove(option.id)}
                  className="w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center text-error bg-transparent hover:bg-error-container transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>`;

const r1 = c.replace(/onRemove=\{removeTimeOption\}/, `onRemove={removeTimeOption}\n                onDuplicate={duplicateTimeOption}`);
const r2 = r1.replace(/onRemove,\r?\n\s*onUpdate,/, `onRemove,\n  onDuplicate,\n  onUpdate,`);
const r3 = r2.replace(/onRemove: \(id: string\) => void;\r?\n\s*onUpdate/, `onRemove: (id: string) => void;\n  onDuplicate: (id: string) => void;\n  onUpdate`);

const startPattern = /className="text-body-md font-medium text-primary leading-none">[\s\S]*?<Trash2 className="w-4 h-4 text-error" \/>\s*<\/button>\s*\)\}\s*<\/div>/;
const r4 = r3.replace(startPattern, replaceStr + '\n          </div>');

fs.writeFileSync('src/app/components/CreateGameScreen.tsx', r4);
