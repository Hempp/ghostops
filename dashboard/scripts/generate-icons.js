const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');
const svgPath = path.join(iconsDir, 'icon.svg');

// Read SVG content
const svgContent = fs.readFileSync(svgPath);

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  // Generate regular icons
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgContent)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated icon-${size}x${size}.png`);
  }

  // Generate maskable icons (with padding for safe zone)
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    const outputPath = path.join(iconsDir, `icon-maskable-${size}x${size}.png`);

    // For maskable icons, the safe zone is 80% of the icon
    // We create a slightly smaller icon centered on a colored background
    const iconSize = Math.floor(size * 0.8);
    const padding = Math.floor((size - iconSize) / 2);

    const iconBuffer = await sharp(svgContent)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 16, g: 185, b: 129, alpha: 1 } // #10b981
      }
    })
      .composite([{
        input: iconBuffer,
        left: padding,
        top: padding
      }])
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated icon-maskable-${size}x${size}.png`);
  }

  // Generate favicon
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await sharp(svgContent)
    .resize(32, 32)
    .png()
    .toFile(faviconPath.replace('.ico', '.png'));
  console.log('\n✓ Generated favicon.png');

  // Generate apple-touch-icon
  const appleTouchPath = path.join(iconsDir, 'apple-touch-icon.png');
  await sharp(svgContent)
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log('✓ Generated apple-touch-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
