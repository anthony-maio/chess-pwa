const fs = require('fs');
const path = require('path');

const piecesDir = path.join(__dirname, '../public/pieces');

function updateImports(dir) {
  const indexPath = path.join(dir, 'index.js');
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, 'utf-8');
  const setName = path.basename(dir);

  // Replace relative SVG imports with absolute imports from root with ?url suffix
  content = content.replace(/import (.+) from '\.\/(.+\.svg)(\?url)?';/g, (match, varName, fileName) => {
    return `import ${varName} from '/pieces/${setName}/${fileName}?url';`;
  });

  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log(`Updated imports in ${indexPath}`);
}

function walkDirs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      updateImports(path.join(dir, entry.name));
    }
  }
}

walkDirs(piecesDir);
console.log('All piece set imports updated.');