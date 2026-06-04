import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetPath = path.join('v:', 'Techpromedicover', '.vscode', 'TECHPRO DEMO', 'room-expense-tracker', 'frontend', 'dist', 'assets');
const files = fs.readdirSync(assetPath);
const jsFile = files.find(f => f.endsWith('.js'));

if (jsFile) {
  const filePath = path.join(assetPath, jsFile);
  console.log('Inspecting JS file:', filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const targetLine = lines[285]; // 286 is 0-indexed 285
  if (targetLine) {
    console.log(`Line 286 length: ${targetLine.length}`);
    console.log('Context around column 10869:');
    console.log(targetLine.substring(10500, 11200));
  } else {
    console.log('Line 286 not found.');
  }
} else {
  console.log('JS bundle not found.');
}
