"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("./index.js");
async function main() {
    const args = process.argv.slice(2);
    const text = args[0] || 'https://github.com/origami-suki/MDE-QRCode';
    const outFile = args[1] || 'qrcode.svg';
    const logoUrl = args[2];
    console.log(`Generating Material Expressive QR Code for: ${text}`);
    // Detect format from extension
    const ext = path_1.default.extname(outFile).toLowerCase().slice(1);
    const format = (ext === 'png' || ext === 'jpg' || ext === 'jpeg') ? ext : 'svg';
    try {
        const output = await (0, index_js_1.generateMDEQRCode)({
            text,
            logoUrl,
        }, format);
        // Resolve output path. If just a filename, put in 'output' directory.
        let outPath = path_1.default.resolve(process.cwd(), outFile);
        if (path_1.default.dirname(outFile) === '.') {
            outPath = path_1.default.resolve(process.cwd(), 'output', outFile);
        }
        // Ensure directory exists
        fs_1.default.mkdirSync(path_1.default.dirname(outPath), { recursive: true });
        fs_1.default.writeFileSync(outPath, output);
        console.log(`Successfully generated QR Code (${format.toUpperCase()}) at: ${outPath}`);
    }
    catch (error) {
        console.error('Failed to generate QR Code:', error);
        process.exit(1);
    }
}
main();
