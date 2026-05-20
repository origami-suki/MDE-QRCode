"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMDEQRCodeSVG = generateMDEQRCodeSVG;
exports.generateMDEQRCode = generateMDEQRCode;
const qrcode_1 = __importDefault(require("qrcode"));
const resvg_js_1 = require("@resvg/resvg-js");
const jimp_1 = require("jimp");
async function generateMDEQRCodeSVG(options) {
    const { text, size: viewSize = 512, margin = 4, primaryColor = '#1D1B20', // M3 OnSurface (Very dark)
    backgroundColor = '#FFFFFF', errorCorrectionLevel = 'H', } = options;
    const qr = qrcode_1.default.create(text, { errorCorrectionLevel });
    const { modules } = qr;
    const count = modules.size;
    const cellSize = viewSize / (count + margin * 2);
    const offset = margin * cellSize;
    let svgPaths = '';
    // Background
    svgPaths += `<rect width="${viewSize}" height="${viewSize}" fill="${backgroundColor}" />`;
    const isDark = (x, y) => {
        if (x < 0 || y < 0 || x >= count || y >= count)
            return false;
        return modules.get(x, y) !== 0;
    };
    const isFinder = (x, y) => {
        if (x < 7 && y < 7)
            return true;
        if (x >= count - 7 && y < 7)
            return true;
        if (x < 7 && y >= count - 7)
            return true;
        return false;
    };
    const logoScale = 0.22;
    const logoAreaSize = count * logoScale;
    const logoStart = (count - logoAreaSize) / 2;
    const logoEnd = logoStart + logoAreaSize;
    // Mask slightly larger area to avoid dots clinging too close to the logo container
    const isLogoArea = (x, y) => {
        return x >= logoStart - 0.5 && x < logoEnd + 0.5 && y >= logoStart - 0.5 && y < logoEnd + 0.5;
    };
    const radius = cellSize * 0.5;
    // Draw modules
    for (let y = 0; y < count; y++) {
        for (let x = 0; x < count; x++) {
            if (isLogoArea(x, y) || isFinder(x, y))
                continue;
            const cx = offset + x * cellSize;
            const cy = offset + y * cellSize;
            if (isDark(x, y)) {
                // 1. Draw Black Cell with Convex (Outer) rounding where exposed to White cells
                const T = isDark(x, y - 1) && !isFinder(x, y - 1) && !isLogoArea(x, y - 1);
                const B = isDark(x, y + 1) && !isFinder(x, y + 1) && !isLogoArea(x, y + 1);
                const L = isDark(x - 1, y) && !isFinder(x - 1, y) && !isLogoArea(x - 1, y);
                const R = isDark(x + 1, y) && !isFinder(x + 1, y) && !isLogoArea(x + 1, y);
                const rTL = (T || L) ? 0 : radius;
                const rTR = (T || R) ? 0 : radius;
                const rBL = (B || L) ? 0 : radius;
                const rBR = (B || R) ? 0 : radius;
                svgPaths += `<path d="
          M ${cx + rTL} ${cy}
          L ${cx + cellSize - rTR} ${cy}
          Q ${cx + cellSize} ${cy} ${cx + cellSize} ${cy + rTR}
          L ${cx + cellSize} ${cy + cellSize - rBR}
          Q ${cx + cellSize} ${cy + cellSize} ${cx + cellSize - rBR} ${cy + cellSize}
          L ${cx + rBL} ${cy + cellSize}
          Q ${cx} ${cy + cellSize} ${cx} ${cy + cellSize - rBL}
          L ${cx} ${cy + rTL}
          Q ${cx} ${cy} ${cx + rTL} ${cy}
          Z" fill="${primaryColor}" />`;
            }
            else {
                // 2. Draw Black Concave (Inner) corner fills inside White cells
                // This rounds out L-shaped turns perfectly without leaving gaps
                const T = isDark(x, y - 1) && !isFinder(x, y - 1) && !isLogoArea(x, y - 1);
                const B = isDark(x, y + 1) && !isFinder(x, y + 1) && !isLogoArea(x, y + 1);
                const L = isDark(x - 1, y) && !isFinder(x - 1, y) && !isLogoArea(x - 1, y);
                const R = isDark(x + 1, y) && !isFinder(x + 1, y) && !isLogoArea(x + 1, y);
                // Top-Left corner: Dark above and left
                if (T && L) {
                    svgPaths += `<path d="M ${cx} ${cy} L ${cx + radius} ${cy} A ${radius} ${radius} 0 0 0 ${cx} ${cy + radius} Z" fill="${primaryColor}" />`;
                }
                // Top-Right corner: Dark above and right
                if (T && R) {
                    svgPaths += `<path d="M ${cx + cellSize} ${cy} L ${cx + cellSize - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + cellSize} ${cy + radius} Z" fill="${primaryColor}" />`;
                }
                // Bottom-Left corner: Dark below and left
                if (B && L) {
                    svgPaths += `<path d="M ${cx} ${cy + cellSize} L ${cx + radius} ${cy + cellSize} A ${radius} ${radius} 0 0 1 ${cx} ${cy + cellSize - radius} Z" fill="${primaryColor}" />`;
                }
                // Bottom-Right corner: Dark below and right
                if (B && R) {
                    svgPaths += `<path d="M ${cx + cellSize} ${cy + cellSize} L ${cx + cellSize - radius} ${cy + cellSize} A ${radius} ${radius} 0 0 0 ${cx + cellSize} ${cy + cellSize - radius} Z" fill="${primaryColor}" />`;
                }
            }
        }
    }
    // Draw Bullseye Finders (Concentric Circles)
    const drawBullseyeFinder = (startX, startY) => {
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
    const logoContainerRadius = (logoAreaSize * cellSize) / 2 + cellSize * 0.3;
    // High precision smooth cutout
    svgPaths += `<circle cx="${center}" cy="${center}" r="${logoContainerRadius}" fill="${backgroundColor}" />`;
    if (options.logoUrl) {
        const logoImgSize = logoContainerRadius * 1.45;
        const lx = center - logoImgSize / 2;
        const ly = center - logoImgSize / 2;
        svgPaths = `<defs><clipPath id="logo-clip"><circle cx="${center}" cy="${center}" r="${logoImgSize / 2}" /></clipPath></defs>` + svgPaths;
        svgPaths += `<image href="${options.logoUrl}" x="${lx}" y="${ly}" width="${logoImgSize}" height="${logoImgSize}" clip-path="url(#logo-clip)" />`;
    }
    return `<svg width="${viewSize}" height="${viewSize}" viewBox="0 0 ${viewSize} ${viewSize}" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>`;
}
async function generateMDEQRCode(options, format = 'svg') {
    const svg = await generateMDEQRCodeSVG(options);
    if (format === 'svg') {
        return svg;
    }
    // Convert SVG to PNG
    const resvg = new resvg_js_1.Resvg(svg, {
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
        const image = await jimp_1.Jimp.read(pngBuffer);
        return await image.getBuffer(jimp_1.JimpMime.jpeg);
    }
    throw new Error(`Unsupported format: ${format}`);
}
