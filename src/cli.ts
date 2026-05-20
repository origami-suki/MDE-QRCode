import fs from 'fs';
import path from 'path';
import { generateMDEQRCode, MDEQRCodeFormat } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  const text = args[0] || 'https://github.com/origami-suki/MDE-QRCode';
  const outFile = args[1] || 'qrcode.svg';
  const logoUrl = args[2];

  console.log(`Generating Material Expressive QR Code for: ${text}`);

  // Detect format from extension
  const ext = path.extname(outFile).toLowerCase().slice(1);
  const format: MDEQRCodeFormat = (ext === 'png' || ext === 'jpg' || ext === 'jpeg') ? ext : 'svg';

  try {
    const output = await generateMDEQRCode({
      text,
      logoUrl,
    }, format);

    // Resolve output path. If just a filename, put in 'output' directory.
    let outPath = path.resolve(process.cwd(), outFile);
    if (path.dirname(outFile) === '.') {
      outPath = path.resolve(process.cwd(), 'output', outFile);
    }

    // Ensure directory exists
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    fs.writeFileSync(outPath, output);
    console.log(`Successfully generated QR Code (${format.toUpperCase()}) at: ${outPath}`);
  } catch (error) {
    console.error('Failed to generate QR Code:', error);
    process.exit(1);
  }
}

main();
