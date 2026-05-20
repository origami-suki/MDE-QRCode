import fs from 'fs';
import path from 'path';
import { generateMDEQRCodeSVG } from './index.js';
import { M3Colors } from './colors.js';

async function main() {
  const args = process.argv.slice(2);
  const text = args[0] || 'https://github.com/origami-suki/MDE-QRCode';
  const outFile = args[1] || 'qrcode.svg';
  const logoUrl = args[2];

  console.log(`Generating Material Expressive QR Code for: ${text}`);

  try {
    const svg = await generateMDEQRCodeSVG({
      text,
      primaryColor: M3Colors.primary,
      backgroundColor: M3Colors.surface,
      logoUrl,
    });

    const outPath = path.resolve(process.cwd(), outFile);
    fs.writeFileSync(outPath, svg);
    console.log(`Successfully generated QR Code at: ${outPath}`);
  } catch (error) {
    console.error('Failed to generate QR Code:', error);
    process.exit(1);
  }
}

main();
