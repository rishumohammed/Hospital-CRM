import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(__dirname, '../.nuxt/types/nitro-imports.d.ts');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes("Samad's")) {
    content = content.replace(/Samad's/g, "Samad\\'s");
    fs.writeFileSync(targetFile, content);
    console.log('Successfully escaped unescaped apostrophe in nitro-imports.d.ts');
  }
}
