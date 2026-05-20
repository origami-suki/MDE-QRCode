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
}

export async function generateMDEQRCodeSVG(options: MDEQRCodeOptions): Promise<string> {
  const {
    text,
    size: viewSize = 512,
    margin = 4,
    primaryColor = '#1D1B20', // M3 OnSurface (Very dark)
    backgroundColor = '#FFFFFF',
    errorCorrectionLevel = 'H',
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

  const logoScale = 0.22;
  const logoAreaSize = count * logoScale;
  const logoStart = (count - logoAreaSize) / 2;
  const logoEnd = logoStart + logoAreaSize;

  const isLogoArea = (x: number, y: number): boolean => {
    return x >= logoStart - 1 && x < logoEnd + 1 && y >= logoStart - 1 && y < logoEnd + 1;
  };

  const radius = cellSize * 0.5;

  // Fluid Module Logic: Processing 4 quadrants per cell to handle convex AND concave corners
  for (let y = 0; y <= count; y++) {
    for (let x = 0; x <= count; x++) {
      // We process the corner point at (x, y) which is shared by 4 cells:
      // (x-1, y-1), (x, y-1), (x-1, y), (x, y)
      const m00 = isDark(x - 1, y - 1) && !isFinder(x - 1, y - 1) && !isLogoArea(x - 1, y - 1);
      const m10 = isDark(x, y - 1) && !isFinder(x, y - 1) && !isLogoArea(x, y - 1);
      const m01 = isDark(x - 1, y) && !isFinder(x - 1, y) && !isLogoArea(x - 1, y);
      const m11 = isDark(x, y) && !isFinder(x, y) && !isLogoArea(x, y);

      const cx = offset + x * cellSize;
      const cy = offset + y * cellSize;

      // Configuration bitmask (0-15)
      const config = (m00 ? 1 : 0) | (m10 ? 2 : 0) | (m01 ? 4 : 0) | (m11 ? 8 : 0);

      if (config === 0 || config === 15) continue;

      // Draw the corner based on configuration
      // This logic creates smooth transitions for all 16 possible 2x2 module arrangements
      switch (config) {
        case 1: // Only top-left is dark -> Convex corner
          svgPaths += `<path d="M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 1 ${cx - radius} ${cy} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          break;
        case 2: // Only top-right is dark
          svgPaths += `<path d="M ${cx + radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx} ${cy - radius} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          break;
        case 4: // Only bottom-left is dark
          svgPaths += `<path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx} ${cy + radius} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          break;
        case 8: // Only bottom-right is dark
          svgPaths += `<path d="M ${cx} ${cy + radius} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          break;
        case 7: // All except bottom-right are dark -> Concave corner
          svgPaths += `<path d="M ${cx} ${cy + radius} A ${radius} ${radius} 0 0 0 ${cx + radius} ${cy} L ${cx + radius} ${cy + radius} Z" fill="${primaryColor}" />`;
          break;
        case 11: // All except bottom-left are dark
          svgPaths += `<path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 0 ${cx} ${cy + radius} L ${cx - radius} ${cy + radius} Z" fill="${primaryColor}" />`;
          break;
        case 13: // All except top-right are dark
          svgPaths += `<path d="M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 0 ${cx + radius} ${cy} L ${cx + radius} ${cy - radius} Z" fill="${primaryColor}" />`;
          break;
        case 14: // All except top-left are dark
          svgPaths += `<path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 0 ${cx} ${cy - radius} L ${cx - radius} ${cy - radius} Z" fill="${primaryColor}" />`;
          break;
        // Standard straight connections
        case 3: svgPaths += `<rect x="${cx - radius}" y="${cy - radius}" width="${cellSize}" height="${radius}" fill="${primaryColor}" />`; break;
        case 12: svgPaths += `<rect x="${cx - radius}" y="${cy}" width="${cellSize}" height="${radius}" fill="${primaryColor}" />`; break;
        case 5: svgPaths += `<rect x="${cx - radius}" y="${cy - radius}" width="${radius}" height="${cellSize}" fill="${primaryColor}" />`; break;
        case 10: svgPaths += `<rect x="${cx}" y="${cy - radius}" width="${radius}" height="${cellSize}" fill="${primaryColor}" />`; break;
        // Diagonal cases (rare but happen)
        case 6: // m10 and m01
          svgPaths += `<path d="M ${cx + radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx} ${cy - radius} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          svgPaths += `<path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx} ${cy + radius} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          break;
        case 9: // m00 and m11
          svgPaths += `<path d="M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 1 ${cx - radius} ${cy} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          svgPaths += `<path d="M ${cx} ${cy + radius} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy} L ${cx} ${cy} Z" fill="${primaryColor}" />`;
          break;
      }
    }
  }

  // Draw Bullseye Finders (Concentric Circles)
  const drawBullseyeFinder = (startX: number, startY: number) => {
    const x = offset + (startX + 3.5) * cellSize;
    const y = offset + (startY + 3.5) * cellSize;
    
    // Outer Ring
    const outerRadius = 3.5 * cellSize;
    const innerRadius = 2.5 * cellSize;
    svgPaths += `<path d="M ${x} ${y - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${x} ${y + outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${x} ${y - outerRadius} M ${x} ${y - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${x} ${y + innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${x} ${y - innerRadius} Z" fill="${primaryColor}" fill-rule="evenodd" />`;

    // Inner eye
    const eyeRadius = 1.5 * cellSize;
    svgPaths += `<circle cx="${x}" cy="${y}" r="${eyeRadius}" fill="${primaryColor}" />`;
  };

  drawBullseyeFinder(0, 0);
  drawBullseyeFinder(count - 7, 0);
  drawBullseyeFinder(0, count - 7);

  // Logo Cutout and Logo
  const center = viewSize / 2;
  const logoContainerRadius = (logoAreaSize * cellSize) / 2 + cellSize * 0.2;
  
  svgPaths += `<circle cx="${center}" cy="${center}" r="${logoContainerRadius}" fill="${backgroundColor}" />`;
  
  if (options.logoUrl) {
    const logoImgSize = logoContainerRadius * 1.5;
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

  // Convert SVG to PNG
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
