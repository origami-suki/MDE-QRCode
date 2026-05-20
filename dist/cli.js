"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("./index.js");
const colors_js_1 = require("./colors.js");
async function main() {
    const args = process.argv.slice(2);
    const text = args[0] || 'https://github.com/origami-suki/MDE-QRCode';
    const outFile = args[1] || 'qrcode.svg';
    const logoUrl = args[2];
    console.log(`Generating Material Expressive QR Code for: ${text}`);
    try {
        const svg = await (0, index_js_1.generateMDEQRCodeSVG)({
            text,
            primaryColor: colors_js_1.M3Colors.primary,
            backgroundColor: colors_js_1.M3Colors.surface,
            logoUrl,
        });
        const outPath = path_1.default.resolve(process.cwd(), outFile);
        fs_1.default.writeFileSync(outPath, svg);
        console.log(`Successfully generated QR Code at: ${outPath}`);
    }
    catch (error) {
        console.error('Failed to generate QR Code:', error);
        process.exit(1);
    }
}
main();
