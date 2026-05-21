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
  fluidRadius?: number; // Custom roundness level (0.0 to 1.0)
  fluidRadius2?: number; // Custom roundness level for connected corners (0.0 to 1.0)
}

export async function generateMDEQRCodeSVG(options: MDEQRCodeOptions): Promise<string> {
  const {
    text,
    size: viewSize = 512,
    margin = 4,
    primaryColor = '#1D1B20', // M3 OnSurface (Very dark)
    backgroundColor = '#FFFFFF',
    errorCorrectionLevel = 'H',
    fluidRadius = 1.0,
    fluidRadius2 = 0.1,
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
    if (!hasLogo) return false;
    return x >= logoStart - 0.5 && x < logoEnd + 0.5 && y >= logoStart - 0.5 && y < logoEnd + 0.5;
  };

  const radius = cellSize * 0.5 * Math.max(0, Math.min(1.0, fluidRadius));
  const radius2 = cellSize * 0.5 * Math.max(0, Math.min(1.0, fluidRadius2));
  const overlap = 0.5; // 0.5px sub-pixel overlap to completely eliminate fine white gaps/creases

  // Draw modules
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (isLogoArea(x, y) || isFinder(x, y)) continue;

      const cx = offset + x * cellSize;
      const cy = offset + y * cellSize;

      if (isDark(x, y)) {
        // 1. Draw Black Cell with Overlaps and Convex Corners (Only adjacent neighbors prevent outer roundings)
        const T = isDark(x, y - 1) && !isFinder(x, y - 1) && !isLogoArea(x, y - 1);
        const B = isDark(x, y + 1) && !isFinder(x, y + 1) && !isLogoArea(x, y + 1);
        const L = isDark(x - 1, y) && !isFinder(x - 1, y) && !isLogoArea(x - 1, y);
        const R = isDark(x + 1, y) && !isFinder(x + 1, y) && !isLogoArea(x + 1, y);

        const rTL = (T && L) ? radius2 : ((T || L) ? 0 : radius);
        const rTR = (T && R) ? radius2 : ((T || R) ? 0 : radius);
        const rBL = (B && L) ? radius2 : ((B || L) ? 0 : radius);
        const rBR = (B && R) ? radius2 : ((B || R) ? 0 : radius);

        // Apply slight physical overlap to connecting edges
        const w = R ? cellSize + overlap : cellSize;
        const h = B ? cellSize + overlap : cellSize;

        svgPaths += `<path d="
          M ${cx + rTL} ${cy}
          L ${cx + w - rTR} ${cy}
          ${rTR > 0 ? `A ${rTR} ${rTR} 0 0 1 ${cx + w} ${cy + rTR}` : `L ${cx + w} ${cy}`}
          L ${cx + w} ${cy + h - rBR}
          ${rBR > 0 ? `A ${rBR} ${rBR} 0 0 1 ${cx + w - rBR} ${cy + h}` : `L ${cx + w} ${cy + h}`}
          L ${cx + rBL} ${cy + h}
          ${rBL > 0 ? `A ${rBL} ${rBL} 0 0 1 ${cx} ${cy + h - rBL}` : `L ${cx} ${cy + h}`}
          L ${cx} ${cy + rTL}
          ${rTL > 0 ? `A ${rTL} ${rTL} 0 0 1 ${cx + rTL} ${cy}` : `L ${cx} ${cy}`}
          Z" fill="${primaryColor}" />`;
      } else {
        // 2. Draw Concave Corner Fills with Overlaps ONLY if they are connected through the diagonal cell
        // This prevents creating weird chiseled blocks when cells are only diagonally connected
        const T = isDark(x, y - 1) && !isFinder(x, y - 1) && !isLogoArea(x, y - 1);
        const B = isDark(x, y + 1) && !isFinder(x, y + 1) && !isLogoArea(x, y + 1);
        const L = isDark(x - 1, y) && !isFinder(x - 1, y) && !isLogoArea(x - 1, y);
        const R = isDark(x + 1, y) && !isFinder(x + 1, y) && !isLogoArea(x + 1, y);

        const TL = isDark(x - 1, y - 1) && !isFinder(x - 1, y - 1) && !isLogoArea(x - 1, y - 1);
        const TR = isDark(x + 1, y - 1) && !isFinder(x + 1, y - 1) && !isLogoArea(x + 1, y - 1);
        const BL = isDark(x - 1, y + 1) && !isFinder(x - 1, y + 1) && !isLogoArea(x - 1, y + 1);
        const BR = isDark(x + 1, y + 1) && !isFinder(x + 1, y + 1) && !isLogoArea(x + 1, y + 1);

        // Top-Left corner: Dark above, left, AND diagonally top-left
        if (T && L && TL) {
          svgPaths += `<path d="M ${cx - overlap} ${cy - overlap} L ${cx + radius2 + overlap} ${cy - overlap} A ${radius2} ${radius2} 0 0 0 ${cx - overlap} ${cy + radius2 + overlap} Z" fill="${primaryColor}" />`;
        }
        // Top-Right corner: Dark above, right, AND diagonally top-right
        if (T && R && TR) {
          svgPaths += `<path d="M ${cx + cellSize + overlap} ${cy - overlap} L ${cx + cellSize - radius2 - overlap} ${cy - overlap} A ${radius2} ${radius2} 0 0 1 ${cx + cellSize + overlap} ${cy + radius2 + overlap} Z" fill="${primaryColor}" />`;
        }
        // Bottom-Left corner: Dark below, left, AND diagonally bottom-left
        if (B && L && BL) {
          svgPaths += `<path d="M ${cx - overlap} ${cy + cellSize + overlap} L ${cx + radius2 + overlap} ${cy + cellSize + overlap} A ${radius2} ${radius2} 0 0 1 ${cx - overlap} ${cy + cellSize - radius2 - overlap} Z" fill="${primaryColor}" />`;
        }
        // Bottom-Right corner: Dark below, right, AND diagonally bottom-right
        if (B && R && BR) {
          svgPaths += `<path d="M ${cx + cellSize + overlap} ${cy + cellSize + overlap} L ${cx + cellSize - radius2 - overlap} ${cy + cellSize + overlap} A ${radius2} ${radius2} 0 0 0 ${cx + cellSize + overlap} ${cy + cellSize - radius2 - overlap} Z" fill="${primaryColor}" />`;
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
