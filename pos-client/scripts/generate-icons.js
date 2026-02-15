#!/usr/bin/env node

/**
 * Generate platform-specific icons from SVG source
 * Uses icon-gen to create PNG, ICO, and ICNS files
 */

const icongen = require('icon-gen');
const path = require('path');
const fs = require('fs');

const options = {
  report: true,
  ico: {
    name: 'icon',
    sizes: [16, 24, 32, 48, 64, 128, 256]
  },
  icns: {
    name: 'icon',
    sizes: [16, 32, 64, 128, 256, 512, 1024]
  },
  favicon: {
    name: 'icon',
    pngSizes: [32, 57, 72, 96, 120, 128, 144, 152, 195, 228, 512],
    icoSizes: [16, 24, 32, 48, 64]
  }
};

const input = path.join(__dirname, '../build/icon.svg');
const output = path.join(__dirname, '../build');

console.log('Generating icons from SVG...');
console.log('Input:', input);
console.log('Output:', output);

// Check if SVG exists
if (!fs.existsSync(input)) {
  console.error('Error: icon.svg not found at', input);
  process.exit(1);
}

icongen(input, output, options)
  .then((results) => {
    console.log('✓ Icons generated successfully!');
    console.log('Generated files:');
    results.forEach(result => {
      console.log(' -', path.basename(result));
    });
  })
  .catch((err) => {
    console.error('Error generating icons:', err);
    process.exit(1);
  });
