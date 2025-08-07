const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Read the SVG file
const svgPath = path.join(__dirname, '../public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Generate icons for each size
sizes.forEach(size => {
  const outputPath = path.join(__dirname, `../public/icon-${size}x${size}.png`);
  
  sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath)
    .then(() => {
      console.log(`Generated ${size}x${size} icon`);
    })
    .catch(err => {
      console.error(`Error generating ${size}x${size} icon:`, err);
    });
});

// Also generate favicon.ico
sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(path.join(__dirname, '../public/favicon.png'))
  .then(() => {
    console.log('Generated favicon');
  })
  .catch(err => {
    console.error('Error generating favicon:', err);
  });