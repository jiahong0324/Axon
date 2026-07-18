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

const logoPath = path.join(__dirname, '..', 'public', 'icons', 'logo.png');
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
  console.log('Loading logo from:', logoPath);
  const logo = await Jimp.read(logoPath);
  
  for (const dev of devices) {
    // Standard dark background: #0A0F1E
    const bg = new Jimp(dev.pw, dev.ph, 0x0A0F1EFF);

    // Physical logo size matching web splash logo size (7rem) + aura on iOS screens
    const logoSize = Math.round(dev.r * 175);
    const scaledLogo = logo.clone().resize(logoSize, logoSize);
    
    // Add rounded corners to logo (1.5rem / 7rem ratio = ~0.214)
    const cornerRadius = Math.round(logoSize * 0.214);
    scaledLogo.scan(0, 0, logoSize, logoSize, function (lx, ly, idx) {
      let cX = 0, cY = 0;
      if (lx < cornerRadius) cX = cornerRadius - lx;
      else if (lx >= logoSize - cornerRadius) cX = lx - (logoSize - cornerRadius - 1);
      
      if (ly < cornerRadius) cY = cornerRadius - ly;
      else if (ly >= logoSize - cornerRadius) cY = ly - (logoSize - cornerRadius - 1);

      if (cX > 0 && cY > 0) {
        const cDist = Math.sqrt(cX * cX + cY * cY);
        if (cDist > cornerRadius) {
          this.bitmap.data[idx + 3] = 0;
        } else if (cDist > cornerRadius - 1) {
          this.bitmap.data[idx + 3] = Math.round(this.bitmap.data[idx + 3] * (1 - (cDist - (cornerRadius - 1))));
        }
      }
    });

    // Create glowing blue aura matching 58px box-shadow spread
    const glowSize = Math.round(logoSize * 2.1);
    const glow = new Jimp(glowSize, glowSize, 0x00000000);
    const glowRadius = glowSize / 2;

    glow.scan(0, 0, glowSize, glowSize, function (gx, gy, idx) {
      const dx = gx - glowRadius;
      const dy = gy - glowRadius;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < glowRadius) {
        const factor = Math.pow(1 - dist / glowRadius, 2.0);
        this.bitmap.data[idx + 0] = Math.round(59 * factor);   // R
        this.bitmap.data[idx + 1] = Math.round(130 * factor);  // G
        this.bitmap.data[idx + 2] = Math.round(246 * factor);  // B
        this.bitmap.data[idx + 3] = Math.round(115 * factor);  // Alpha (0.7 initial opacity matching 0% frame)
      }
    });

    // Composite glow onto background
    const glowX = Math.round((dev.pw - glowSize) / 2);
    const glowY = Math.round((dev.ph - glowSize) / 2);
    bg.composite(glow, glowX, glowY);

    // Composite logo over glow in exact center
    const x = Math.round((dev.pw - logoSize) / 2);
    const y = Math.round((dev.ph - logoSize) / 2);
    bg.composite(scaledLogo, x, y);
    
    const outputName = `splash-${dev.pw}x${dev.ph}.png`;
    const outputPath = path.join(splashDir, outputName);
    await bg.writeAsync(outputPath);
    console.log(`Generated: ${outputName} (${dev.pw}x${dev.ph})`);
  }
  
  console.log('All splash screens generated successfully with Image 2 blue glow!');
}

generate().catch(console.error);
