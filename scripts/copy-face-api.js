const fs = require('fs');
const path = require('path');

const nodeModules = path.join(__dirname, '..', 'node_modules', '@vladmandic', 'face-api');
const distPath = path.join(nodeModules, 'dist', 'face-api.js');
const outPath = path.join(__dirname, '..', 'extension', 'face-api.js');

if (!fs.existsSync(distPath)) {
  console.warn('Run "npm install" first. @vladmandic/face-api dist not found at:', distPath);
  process.exit(0);
}

fs.copyFileSync(distPath, outPath);
console.log('Copied face-api.js to extension/');
