import QRCode from 'qrcode';
import { M3Colors } from './colors.js';

export interface MDEQRCodeOptions {
  text: string;
  size?: number;
  margin?: number;
  primaryColor?: string;
  backgroundColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  logoUrl?: string;
  logoSize?: number;
}

export async function generateMDEQRCodeSVG(options: MDEQRCodeOptions): Promise<string> {
  const {
    text,
    size: viewSize = 512,
    margin = 4,
    primaryColor = M3Colors.primary,
    backgroundColor = M3Colors.surface,
    errorCorrectionLevel = 'H',
  } = options;

  const qr = QRCode.create(text, { errorCorrectionLevel });
  const { modules } = qr;
  const count = modules.size;
  const cellSize = viewSize / (count + margin * 2);
  const offset = margin * cellSize;

  let svgPaths = '';

  // Background
  svgPaths += `<rect width="${viewSize}" height="${viewSize}" fill="${backgroundColor}" rx="${viewSize * 0.1}" />`;

  const isFinder = (x: number, y: number): boolean => {
    if (x < 7 && y < 7) return true; // Top-left
    if (x >= count - 7 && y < 7) return true; // Top-right
    if (x < 7 && y >= count - 7) return true; // Bottom-left
    return false;
  };

  // Logo settings
  const logoScale = 0.22; // 22% of the QR code size
  const logoAreaSize = count * logoScale;
  const logoStart = (count - logoAreaSize) / 2;
  const logoEnd = logoStart + logoAreaSize;

  const isLogoArea = (x: number, y: number): boolean => {
    return x >= logoStart && x < logoEnd && y >= logoStart && y < logoEnd;
  };

  // Draw modules
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (modules.get(x, y) && !isFinder(x, y) && !isLogoArea(x, y)) {
        const cx = offset + x * cellSize + cellSize / 2;
        const cy = offset + y * cellSize + cellSize / 2;
        svgPaths += `<circle cx="${cx}" cy="${cy}" r="${cellSize * 0.42}" fill="${primaryColor}" />`;
      }
    }
  }

  // Draw Finders...
  const drawFinder = (startX: number, startY: number) => {
    const x = offset + startX * cellSize;
    const y = offset + startY * cellSize;
    const outerSize = 7 * cellSize;
    const innerSize = 3 * cellSize;
    const innerOffset = 2 * cellSize;
    const radius = cellSize * 2.5; // Slightly larger radius for expressive look

    // Outer frame (Rounded square with hole)
    svgPaths += `<path d="
      M ${x + radius} ${y}
      h ${outerSize - 2 * radius}
      a ${radius} ${radius} 0 0 1 ${radius} ${radius}
      v ${outerSize - 2 * radius}
      a ${radius} ${radius} 0 0 1 -${radius} ${radius}
      h -${outerSize - 2 * radius}
      a ${radius} ${radius} 0 0 1 -${radius} -${radius}
      v -${outerSize - 2 * radius}
      a ${radius} ${radius} 0 0 1 ${radius} -${radius}
      Z
      M ${x + cellSize} ${y + cellSize}
      v ${outerSize - 2 * cellSize}
      h ${outerSize - 2 * cellSize}
      v -${outerSize - 2 * cellSize}
      Z" fill="${primaryColor}" fill-rule="evenodd" />`;

    // Inner eye (Rounded square)
    const eyeRadius = cellSize * 1.5;
    const ex = x + innerOffset;
    const ey = y + innerOffset;
    svgPaths += `<path d="
      M ${ex + eyeRadius} ${ey}
      h ${innerSize - 2 * eyeRadius}
      a ${eyeRadius} ${eyeRadius} 0 0 1 ${eyeRadius} ${eyeRadius}
      v ${innerSize - 2 * eyeRadius}
      a ${eyeRadius} ${eyeRadius} 0 0 1 -${eyeRadius} ${eyeRadius}
      h -${innerSize - 2 * eyeRadius}
      a ${eyeRadius} ${eyeRadius} 0 0 1 -${eyeRadius} -${eyeRadius}
      v -${innerSize - 2 * eyeRadius}
      a ${eyeRadius} ${eyeRadius} 0 0 1 ${eyeRadius} -${eyeRadius}
      Z" fill="${primaryColor}" />`;
  };

  drawFinder(0, 0);
  drawFinder(count - 7, 0);
  drawFinder(0, count - 7);

  // Draw Logo Container (Material Circle)
  const center = viewSize / 2;
  const logoContainerRadius = (logoAreaSize * cellSize) / 2 + cellSize;
  svgPaths += `<circle cx="${center}" cy="${center}" r="${logoContainerRadius}" fill="${backgroundColor}" />`;
  
  // If logo URL is provided, embed it
  if (options.logoUrl) {
    const logoSize = logoContainerRadius * 1.4;
    const lx = center - logoSize / 2;
    const ly = center - logoSize / 2;
    svgPaths += `<image href="${options.logoUrl}" x="${lx}" y="${ly}" width="${logoSize}" height="${logoSize}" />`;
  }

  return `<svg width="${viewSize}" height="${viewSize}" viewBox="0 0 ${viewSize} ${viewSize}" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>`;
}
