import QRCode from 'qrcode';
import { M3Colors } from './colors.js';
import { Resvg } from '@resvg/resvg-js';
import { Jimp, JimpMime } from 'jimp';

export interface MDEQRCodeOptions {
  text: string;
  size?: number;
  margin?: number;
  primaryColor?: string;
  backgroundColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  logoUrl?: string;
  logoSize?: number;
  fluidRadius?: number; // Custom roundness level (0.0 to 0.5)
}

export async function generateMDEQRCodeSVG(options: MDEQRCodeOptions): Promise<string> {
  const {
    text,
    size: viewSize = 512,
    margin = 4,
    primaryColor = '#1D1B20', // M3 OnSurface (Very dark)
    backgroundColor = '#FFFFFF',
    errorCorrectionLevel = 'H',
    fluidRadius = 0.5,
  } = options;

  const qr = QRCode.create(text, { errorCorrectionLevel });
  const { modules } = qr;
  const count = modules.size;
  const cellSize = viewSize / (count + margin * 2);
  const offset = margin * cellSize;

  let svgPaths = '';

  // Background
  svgPaths += `<rect width="${viewSize}" height="${viewSize}" fill="${backgroundColor}" />`;

  const isDark = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= count || y >= count) return false;
    return modules.get(x, y) !== 0;
  };

  const isFinder = (x: number, y: number): boolean => {
    if (x < 7 && y < 7) return true;
    if (x >= count - 7 && y < 7) return true;
    if (x < 7 && y >= count - 7) return true;
    return false;
  };

  const hasLogo = !!options.logoUrl;
  const logoScale = 0.22;
  const logoAreaSize = count * logoScale;
  const logoStart = (count - logoAreaSize) / 2;
  const logoEnd = logoStart + logoAreaSize;

  const isLogoArea = (x: number, y: number): boolean => {
    if (!hasLogo) return false; // If no logo, do not mask/clear the center area
    return x >= logoStart - 0.5 && x < logoEnd + 0.5 && y >= logoStart - 0.5 && y < logoEnd + 0.5;
  };

  const radius = cellSize * Math.max(0, Math.min(0.5, fluidRadius));
  const overlap = 0.5; // 0.5px sub-pixel overlap to completely eliminate fine white gaps/creases

  // Draw modules
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (isLogoArea(x, y) || isFinder(x, y)) continue;

      const cx = offset + x * cellSize;
      const cy = offset + y * cellSize;

      if (isDark(x, y)) {
        // 1. Draw Black Cell with Overlaps and Convex Corners
        const T = isDark(x, y - 1) && !isFinder(x, y - 1) && !isLogoArea(x, y - 1);
        const B = isDark(x, y + 1) && !isFinder(x, y + 1) && !isLogoArea(x, y + 1);
        const L = isDark(x - 1, y) && !isFinder(x - 1, y) && !isLogoArea(x - 1, y);
        const R = isDark(x + 1, y) && !isFinder(x + 1, y) && !isLogoArea(x + 1, y);

        const rTL = (T || L) ? 0 : radius;
        const rTR = (T || R) ? 0 : radius;
        const rBL = (B || L) ? 0 : radius;
        const rBR = (B || R) ? 0 : radius;

        // Apply slight physical overlap to connecting edges
        const w = R ? cellSize + overlap : cellSize;
        const h = B ? cellSize + overlap : cellSize;

        svgPaths += `<path d="
          M ${cx + rTL} ${cy}
          L ${cx + w - rTR} ${cy}
          Q ${cx + w} ${cy} ${cx + w} ${cy + rTR}
          L ${cx + w} ${cy + h - rBR}
          Q ${cx + w} ${cy + h} ${cx + w - rBR} ${cy + h}
          L ${cx + rBL} ${cy + h}
          Q ${cx} ${cy + h} ${cx} ${cy + h - rBL}
          L ${cx} ${cy + rTL}
          Q ${cx} ${cy} ${cx + rTL} ${cy}
          Z" fill="${primaryColor}" />`;
      } else {
        // 2. Draw Concave Corner Fills with Overlaps (No white cracks)
        const T = isDark(x, y - 1) && !isFinder(x, y - 1) && !isLogoArea(x, y - 1);
        const B = isDark(x, y + 1) && !isFinder(x, y + 1) && !isLogoArea(x, y + 1);
        const L = isDark(x - 1, y) && !isFinder(x - 1, y) && !isLogoArea(x - 1, y);
        const R = isDark(x + 1, y) && !isFinder(x + 1, y) && !isLogoArea(x + 1, y);

        // Top-Left corner: Dark above and left
        if (T && L) {
          svgPaths += `<path d="M ${cx - overlap} ${cy - overlap} L ${cx + radius + overlap} ${cy - overlap} A ${radius} ${radius} 0 0 0 ${cx - overlap} ${cy + radius + overlap} Z" fill="${primaryColor}" />`;
        }
        // Top-Right corner: Dark above and right
        if (T && R) {
          svgPaths += `<path d="M ${cx + cellSize + overlap} ${cy - overlap} L ${cx + cellSize - radius - overlap} ${cy - overlap} A ${radius} ${radius} 0 0 1 ${cx + cellSize + overlap} ${cy + radius + overlap} Z" fill="${primaryColor}" />`;
        }
        // Bottom-Left corner: Dark below and left
        if (B && L) {
          svgPaths += `<path d="M ${cx - overlap} ${cy + cellSize + overlap} L ${cx + radius + overlap} ${cy + cellSize + overlap} A ${radius} ${radius} 0 0 1 ${cx - overlap} ${cy + cellSize - radius - overlap} Z" fill="${primaryColor}" />`;
        }
        // Bottom-Right corner: Dark below and right
        if (B && R) {
          svgPaths += `<path d="M ${cx + cellSize + overlap} ${cy + cellSize + overlap} L ${cx + cellSize - radius - overlap} ${cy + cellSize + overlap} A ${radius} ${radius} 0 0 0 ${cx + cellSize + overlap} ${cy + cellSize - radius - overlap} Z" fill="${primaryColor}" />`;
        }
      }
    }
  }

  // Draw Google MDE Finders: Outer is smooth rounded rectangle, Inner is perfect concentric circle
  const drawMDEFinder = (startX: number, startY: number) => {
    const ox = offset + startX * cellSize;
    const oy = offset + startY * cellSize;
    
    const outerSize = 7 * cellSize;
    const outerRadius = 2.2 * cellSize; // Beautiful round corners for squircle frame
    
    const innerHoleOffset = 1.0 * cellSize;
    const innerHoleSize = 5.0 * cellSize;
    const innerHoleRadius = 1.2 * cellSize; // Smooth inner ring hole
    
    // Outer Frame Squircle with cutout (using evenodd fill rule)
    svgPaths += `<path d="
      M ${ox + outerRadius} ${oy}
      h ${outerSize - 2 * outerRadius}
      a ${outerRadius} ${outerRadius} 0 0 1 ${outerRadius} ${outerRadius}
      v ${outerSize - 2 * outerRadius}
      a ${outerRadius} ${outerRadius} 0 0 1 -${outerRadius} ${outerRadius}
      h -${outerSize - 2 * outerRadius}
      a ${outerRadius} ${outerRadius} 0 0 1 -${outerRadius} -${outerRadius}
      v -${outerSize - 2 * outerRadius}
      a ${outerRadius} ${outerRadius} 0 0 1 ${outerRadius} -${outerRadius}
      Z
      M ${ox + innerHoleOffset + innerHoleRadius} ${oy + innerHoleOffset}
      h ${innerHoleSize - 2 * innerHoleRadius}
      a ${innerHoleRadius} ${innerHoleRadius} 0 0 1 ${innerHoleRadius} ${innerHoleRadius}
      v ${innerHoleSize - 2 * innerHoleRadius}
      a ${innerHoleRadius} ${innerHoleRadius} 0 0 1 -${innerHoleRadius} ${innerHoleRadius}
      h -${innerHoleSize - 2 * innerHoleRadius}
      a ${innerHoleRadius} ${innerHoleRadius} 0 0 1 -${innerHoleRadius} -${innerHoleRadius}
      v -${innerHoleSize - 2 * innerHoleRadius}
      a ${innerHoleRadius} ${innerHoleRadius} 0 0 1 ${innerHoleRadius} -${innerHoleRadius}
      Z" fill="${primaryColor}" fill-rule="evenodd" />`;

    // Center eye: Perfect Circle (Google style)
    const centerEyeX = ox + 3.5 * cellSize;
    const centerEyeY = oy + 3.5 * cellSize;
    const eyeRadius = 1.5 * cellSize;
    svgPaths += `<circle cx="${centerEyeX}" cy="${centerEyeY}" r="${eyeRadius}" fill="${primaryColor}" />`;
  };

  drawMDEFinder(0, 0);
  drawMDEFinder(count - 7, 0);
  drawMDEFinder(0, count - 7);

  // Logo Cutout and Logo Embedding (Only if logo URL is provided)
  if (hasLogo) {
    const center = viewSize / 2;
    const logoContainerRadius = (logoAreaSize * cellSize) / 2 + cellSize * 0.3;
    
    // Seamless mask cutout
    svgPaths += `<circle cx="${center}" cy="${center}" r="${logoContainerRadius}" fill="${backgroundColor}" />`;
    
    const logoImgSize = logoContainerRadius * 1.45;
    const lx = center - logoImgSize / 2;
    const ly = center - logoImgSize / 2;
    svgPaths = `<defs><clipPath id="logo-clip"><circle cx="${center}" cy="${center}" r="${logoImgSize/2}" /></clipPath></defs>` + svgPaths;
    svgPaths += `<image href="${options.logoUrl}" x="${lx}" y="${ly}" width="${logoImgSize}" height="${logoImgSize}" clip-path="url(#logo-clip)" />`;
  }

  return `<svg width="${viewSize}" height="${viewSize}" viewBox="0 0 ${viewSize} ${viewSize}" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>`;
}

export type MDEQRCodeFormat = 'svg' | 'png' | 'jpg' | 'jpeg';

export async function generateMDEQRCode(
  options: MDEQRCodeOptions,
  format: MDEQRCodeFormat = 'svg'
): Promise<string | Buffer> {
  const svg = await generateMDEQRCodeSVG(options);

  if (format === 'svg') {
    return svg;
  }

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: options.size || 512,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  if (format === 'png') {
    return pngBuffer;
  }

  if (format === 'jpg' || format === 'jpeg') {
    const image = await Jimp.read(pngBuffer);
    return await image.getBuffer(JimpMime.jpeg);
  }

  throw new Error(`Unsupported format: ${format}`);
}
