const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../landing-page/src/assets/logo-light.png');
const outputPath = path.join(__dirname, '../landing-page/src/assets/logo-light-trimmed.png');

sharp(inputPath)
  .trim()
  .toFile(outputPath)
  .then(info => {
    console.log('Trimmed image saved:', info);
  })
  .catch(err => {
    console.error('Error trimming image:', err);
  });
