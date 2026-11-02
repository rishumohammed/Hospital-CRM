const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '../../../node_modules/.pnpm'),
  'D:/Consulting/crm/node_modules/.pnpm',
];

for (const base of candidates) {
  if (!fs.existsSync(base)) continue;
  const entries = fs.readdirSync(base);
  for (const entry of entries) {
    if (entry.startsWith('unhead@')) {
      const targetMjs = path.join(base, entry, 'node_modules/unhead/dist/index.mjs');
      if (fs.existsSync(targetMjs)) {
        let content = fs.readFileSync(targetMjs, 'utf8');
        if (!content.includes('getActiveHead')) {
          content += "\nexport { getActiveHead, activeHead, createHead } from './legacy.mjs';\n";
          fs.writeFileSync(targetMjs, content, 'utf8');
          console.log(`[patch-unhead] Patched ${targetMjs}`);
        } else {
          console.log(`[patch-unhead] Already patched ${targetMjs}`);
        }
      }
    }
  }
}
