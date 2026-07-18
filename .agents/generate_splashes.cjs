const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure jimp is installed
try {
  require.resolve('jimp');
} catch (e) {
  console.log('Installing jimp locally for image generation...');
  execSync('npm install jimp@0.22.12 --no-save', { stdio: 'inherit' });
}

const Jimp = require('jimp');

const axonPublicIcons = path.join(__dirname, '..', 'public', 'icons');
const splashDir = path.join(axonPublicIcons, 'splash');

if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// iOS PWA splash screen specifications
const devices = [
  // iPhones
  { name: 'iphone6s', w: 375, h: 667, r: 2, pw: 750, ph: 1334 },
  { name: 'iphone8plus', w: 414, h: 736, r: 3, pw: 1242, ph: 2208 },
  { name: 'iphonex', w: 375, h: 812, r: 3, pw: 1125, ph: 2436 },
  { name: 'iphonexr', w: 414, h: 896, r: 2, pw: 828, ph: 1792 },
  { name: 'iphonexsmax', w: 414, h: 896, r: 3, pw: 1242, ph: 2688 },
  { name: 'iphone12', w: 390, h: 844, r: 3, pw: 1170, ph: 2532 },
  { name: 'iphone12promax', w: 428, h: 926, r: 3, pw: 1284, ph: 2778 },
  { name: 'iphone14pro', w: 393, h: 852, r: 3, pw: 1179, ph: 2556 },
  { name: 'iphone14promax', w: 430, h: 932, r: 3, pw: 1290, ph: 2796 },
  { name: 'iphone16pro', w: 402, h: 874, r: 3, pw: 1206, ph: 2622 },
  { name: 'iphone16promax', w: 440, h: 956, r: 3, pw: 1320, ph: 2868 },
  // iPads
  { name: 'ipad9', w: 768, h: 1024, r: 2, pw: 1536, ph: 2048 },
  { name: 'ipadpro10', w: 834, h: 1112, r: 2, pw: 1668, ph: 2224 },
  { name: 'ipadpro11', w: 834, h: 1194, r: 2, pw: 1668, ph: 2388 },
  { name: 'ipadpro12', w: 1024, h: 1366, r: 2, pw: 2048, ph: 2732 }
];

async function generate() {
  for (const dev of devices) {
    // Keep iOS native launch blank and dark. The web splash fades the logo in,
    // avoiding a static native logo being replaced by an animated web logo.
    const bg = new Jimp(dev.pw, dev.ph, 0x0A0F1EFF);
    
    const outputName = `splash-${dev.pw}x${dev.ph}.png`;
    const outputPath = path.join(splashDir, outputName);
    await bg.writeAsync(outputPath);
    console.log(`Generated: ${outputName} (${dev.pw}x${dev.ph})`);
  }
  
  console.log('All dark iOS launch screens generated successfully.');
}

generate().catch(console.error);
