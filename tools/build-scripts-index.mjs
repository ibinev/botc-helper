// Regenerates assets/scripts/index.json from whatever *.json files are
// actually in the folder, so bundled scripts never need to be listed by hand.
// Run via `npm run build-scripts-index` (also runs automatically before `npm start`).
import fs from 'node:fs';
import path from 'node:path';

const scriptsDir = path.join(process.cwd(), 'assets', 'scripts');

// The 3 base scripts are loaded separately via loadCoreScripts() — exclude them.
const CORE_FILES = new Set(['trouble-brewing.json', 'bad-moon-rising.json', 'sects-and-violets.json']);

const files = fs.readdirSync(scriptsDir)
  .filter(f => f.toLowerCase().endsWith('.json'))
  .filter(f => f !== 'index.json' && !CORE_FILES.has(f))
  .sort((a, b) => a.localeCompare(b));

fs.writeFileSync(path.join(scriptsDir, 'index.json'), JSON.stringify(files, null, 2) + '\n');
console.log(`Wrote assets/scripts/index.json with ${files.length} file(s): ${files.join(', ')}`);
