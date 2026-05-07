#!/usr/bin/env node
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, './src/input.css');
const outputPath = path.join(__dirname, './docs/css/style.css');

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read input CSS
const input = fs.readFileSync(inputPath, 'utf8');

// Process with PostCSS and Tailwind v4
postcss([
  tailwind({ config: './tailwind.config.js' }),
  require('autoprefixer'),
])
  .process(input, { from: inputPath, to: outputPath })
  .then(result => {
    fs.writeFileSync(outputPath, result.css);
    console.log(`✓ Generated ${outputPath}`);
  })
  .catch(err => {
    console.error('Error building CSS:', err);
    process.exit(1);
  });
