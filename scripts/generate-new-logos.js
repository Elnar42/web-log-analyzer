const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Generate new custom WebAnalyzer logo design
const createLogoSVG = (size, isDark = false, gradientId = 'grad') => {
  const primaryColor = '#3b82f6';  // Blue
  const secondaryColor = '#8b5cf6';  // Purple
  const accentColor = '#10b981';  // Green for data points
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="180" height="180" rx="36" fill="url(#${gradientId})"/>
  <g transform="translate(25, 25)">
    <!-- Chart bars representing analytics -->
    <rect x="20" y="80" width="12" height="40" rx="2" fill="white" fill-opacity="0.4"/>
    <rect x="40" y="60" width="12" height="60" rx="2" fill="white" fill-opacity="0.4"/>
    <rect x="60" y="50" width="12" height="70" rx="2" fill="white" fill-opacity="0.4"/>
    <rect x="80" y="40" width="12" height="80" rx="2" fill="white" fill-opacity="0.4"/>
    <rect x="100" y="30" width="12" height="90" rx="2" fill="white" fill-opacity="0.4"/>
    <!-- Line graph overlay -->
    <path d="M26 100 L46 80 L66 70 L86 60 L106 50" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <!-- Data points -->
    <circle cx="26" cy="100" r="3" fill="white"/>
    <circle cx="46" cy="80" r="3" fill="white"/>
    <circle cx="66" cy="70" r="3" fill="white"/>
    <circle cx="86" cy="60" r="3" fill="white"/>
    <circle cx="106" cy="50" r="3" fill="white"/>
    <!-- WA monogram at bottom -->
    <g transform="translate(63, 120)">
      <!-- W -->
      <path d="M-20 0 L-16 -16 L-10 0 L-4 -16 L0 0" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <!-- A -->
      <path d="M6 -16 L3 0 L11 0" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <line x1="4.5" y1="-8" x2="9.5" y2="-8" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;
};

async function generateLogos() {
  try {
    console.log('Generating new custom logos...\n');

    // Generate icon.svg
    const iconSVG = createLogoSVG(180, false, 'gradMain');
    fs.writeFileSync(path.join(publicDir, 'icon.svg'), iconSVG);
    console.log('✓ Generated icon.svg');

    // Generate icon-light-32x32.png
    const lightIconSVG = createLogoSVG(180, false, 'gradLight');
    await sharp(Buffer.from(lightIconSVG))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'icon-light-32x32.png'));
    console.log('✓ Generated icon-light-32x32.png');

    // Generate icon-dark-32x32.png (brighter for dark backgrounds)
    const darkIconSVG = createLogoSVG(180, true, 'gradDark');
    await sharp(Buffer.from(darkIconSVG))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'icon-dark-32x32.png'));
    console.log('✓ Generated icon-dark-32x32.png');

    // Generate apple-icon.png (180x180)
    const appleIconSVG = createLogoSVG(180, false, 'gradApple');
    await sharp(Buffer.from(appleIconSVG))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-icon.png'));
    console.log('✓ Generated apple-icon.png');

    // Generate logo.svg (same as icon.svg for header)
    fs.writeFileSync(path.join(publicDir, 'logo.svg'), iconSVG);
    console.log('✓ Generated logo.svg');

    console.log('\n✅ All logos generated successfully!');
  } catch (error) {
    console.error('Error generating logos:', error);
    process.exit(1);
  }
}

generateLogos();

