const fs = require('fs');

const file = 'src/app/components/CreateGameScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Copy icon import
if (!content.includes('Copy')) {
  content = content.replace(
    /import {([^}]+)} from 'lucide-react';/,
    (match, p1) => `import {${p1}, Copy } from 'lucide-react';`
  );
}

// 2. Add duplicateTimeOption function
if (!content.includes('const duplicateTimeOption')) {
  content = content.replace(
    /const removeTimeOption = useCallback\(\(id: string\) => {[\s\S]*?}, \[\]\);/,
    (match) => `${match}

  const duplicateTimeOption = useCallback((id: string) => {
    setTimeOptions(prev => {
      const index = prev.findIndex(opt => opt.id === id);
      if (index === -1) return prev;
      
      const optionToCopy = prev[index];
      const newOption = {
        ...optionToCopy,
        id: Date.now().toString(),
      };
      
      const newOptions = [...prev];
      newOptions.splice(index + 1, 0, newOption);
      return newOptions;
    });
  }, []);`
  );
}

// 3. Update StepTimeLocation props and usage
if (!content.includes('onDuplicate=')) {
  content = content.replace(
    /<StepTimeLocation[\s\S]*?onRemove={removeTimeOption}/,
    match => `${match}\n          onDuplicate={duplicateTimeOption}`
  );
}

// 4. Update StepTimeLocation interface
if (!content.includes('onDuplicate: (id: string) => void')) {
  content = content.replace(
    /onRemove: \(id: string\) => void;/,
    match => `${match}\n  onDuplicate: (id: string) => void;`
  );
}

// 5. Destructure onDuplicate
if (!content.includes('onDuplicate,')) {
  content = content.replace(
    /onAdd,\n  onRemove,/,
    match => `onAdd,\n  onRemove,\n  onDuplicate,`
  );
}

// 6. Add Duplicate button
if (!content.includes('onClick={() => onDuplicate(option.id)}')) {
  // Find the remove button and add the duplicate button before it
  content = content.replace(
    /<Button\s*variant="ghost"\s*size="sm"\s*onClick=\{\(\) => onRemove\(option\.id\)\}\s*className="text-gray-500 hover:text-red-500 p-0 h-auto"\s*>/,
    match => `<Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(option.id)}
              className="text-gray-500 hover:text-gray-900 p-0 h-auto mr-2"
              title="Duplicate time option"
            >
              <Copy className="h-4 w-4" />
            </Button>
            ${match}`
  );
}

fs.writeFileSync(file, content);
console.log('Done');
