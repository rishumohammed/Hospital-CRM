const fs = require('fs');
const path = require('path');

function patchFile(targetMjs) {
  try {
    if (fs.existsSync(targetMjs)) {
      let content = fs.readFileSync(targetMjs, 'utf8');
      if (!content.includes('getActiveHead')) {
        content += "\nexport { getActiveHead, activeHead, createHead } from './legacy.mjs';\n";
        fs.writeFileSync(targetMjs, content, 'utf8');
        console.log(`[patch-unhead] Successfully patched ${targetMjs}`);
      } else {
        console.log(`[patch-unhead] Already patched ${targetMjs}`);
      }
    }
  } catch (err) {
    console.warn(`[patch-unhead] Warning for ${targetMjs}:`, err.message);
  }
}

const searchRoots = [
  path.resolve(__dirname, '../../../node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
  path.resolve(process.cwd(), '../../node_modules'),
  '/app/node_modules',
];

for (const root of searchRoots) {
  if (!fs.existsSync(root)) continue;

  patchFile(path.join(root, 'unhead/dist/index.mjs'));

  const pnpmDir = path.join(root, '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    try {
      const entries = fs.readdirSync(pnpmDir);
      for (const entry of entries) {
        if (entry.startsWith('unhead@')) {
          patchFile(path.join(pnpmDir, entry, 'node_modules/unhead/dist/index.mjs'));
        }
      }
    } catch (e) {
      // ignore
    }
  }
}
