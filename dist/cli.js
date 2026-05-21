"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("./index.js");
function printUsage() {
    console.log(`
\x1b[1mUsage:\x1b[0m
  node dist/cli.js --text <string> [--out <path>] [--logo <url/path>] [--radius <float>] [--size <number>] [--margin <number>] [--primary <hex>] [--bg <hex>] [--level <L|M|Q|H>]
  node dist/cli.js --help
`);
}
function printHelp() {
    console.log(`
\x1b[1m\x1b[35mMaterial Design Expressive (MDE) QR Code Generator\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  node dist/cli.js [options]

\x1b[1mOPTIONS:\x1b[0m
  \x1b[32m--text <string>\x1b[0m       The text or URL to encode inside the QR code.
                         \x1b[90m(Default: "https://github.com/origami-suki/MDE-QRCode")\x1b[0m
  \x1b[32m--out <path>\x1b[0m          The output file path. Suffix determines format (.svg, .png, .jpg).
                         \x1b[90m(Default: "qrcode.svg")\x1b[0m
  \x1b[32m--logo <url/path>\x1b[0m     Optional URL or local file path to a central logo.
                         Use "none" or omit to generate without a logo.
                         \x1b[90m(Default: none)\x1b[0m
  \x1b[32m--radius <float>\x1b[0m      Fluid roundness level between 0.0 (square) and 1.0 (perfect circle).
                         \x1b[90m(Default: 1.0)\x1b[0m
  \x1b[32m--size <number>\x1b[0m       Width/height of the output image in pixels.
                         \x1b[90m(Default: 512)\x1b[0m
  \x1b[32m--margin <number>\x1b[0m     Quiet zone margin size in cell modules.
                         \x1b[90m(Default: 4)\x1b[0m
  \x1b[32m--primary <hex>\x1b[0m       Primary color for the QR code modules (e.g. "#6750A4").
                         \x1b[90m(Default: "#1D1B20" - M3 OnSurface)\x1b[0m
  \x1b[32m--bg <hex>\x1b[0m            Background color of the QR code (e.g. "#FFFFFF").
                         \x1b[90m(Default: "#FFFFFF")\x1b[0m
  \x1b[32m--level <L|M|Q|H>\x1b[0m     Error Correction Level.
                         \x1b[90m(Default: "H" for maximum logo tolerance)\x1b[0m
  \x1b[32m-h, --help\x1b[0m            Display this help and usage message.

\x1b[1mEXAMPLES:\x1b[0m
  \x1b[90m# Generate a basic expressive QR code:\x1b[0m
  node dist/cli.js --text "https://google.com" --out google.svg

  \x1b[90m# Generate a premium PNG QR code with a logo and custom primary color:\x1b[0m
  node dist/cli.js --text "https://github.com" --out github.png --logo "https://github.githubassets.com/favicons/favicon.png" --primary "#24292F" --radius 0.8
`);
}
async function main() {
    const args = process.argv.slice(2);
    let text = 'https://github.com/origami-suki/MDE-QRCode';
    let outFile = 'qrcode.svg';
    let logoUrl = undefined;
    let fluidRadius = 1.0;
    let size = 512;
    let margin = 4;
    let primaryColor = '#1D1B20';
    let backgroundColor = '#FFFFFF';
    let errorCorrectionLevel = 'H';
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
        if (arg === '--text') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --text option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            text = val;
        }
        else if (arg === '--out') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --out option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            outFile = val;
        }
        else if (arg === '--logo') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --logo option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            logoUrl = val === 'none' ? undefined : val;
        }
        else if (arg === '--radius') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --radius option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            const num = parseFloat(val);
            if (isNaN(num) || num < 0.0 || num > 1.0) {
                console.error('\x1b[31mError: --radius must be a float between 0.0 and 1.0.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            fluidRadius = num;
        }
        else if (arg === '--size') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --size option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            const num = parseInt(val, 10);
            if (isNaN(num) || num <= 0) {
                console.error('\x1b[31mError: --size must be a positive integer.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            size = num;
        }
        else if (arg === '--margin') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --margin option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            const num = parseInt(val, 10);
            if (isNaN(num) || num < 0) {
                console.error('\x1b[31mError: --margin must be a non-negative integer.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            margin = num;
        }
        else if (arg === '--primary') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --primary option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            primaryColor = val;
        }
        else if (arg === '--bg') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --bg option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            backgroundColor = val;
        }
        else if (arg === '--level') {
            const val = args[++i];
            if (!val) {
                console.error('\x1b[31mError: Missing value for --level option.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            if (val !== 'L' && val !== 'M' && val !== 'Q' && val !== 'H') {
                console.error('\x1b[31mError: --level must be one of L, M, Q, H.\x1b[0m');
                printUsage();
                process.exit(1);
            }
            errorCorrectionLevel = val;
        }
        else {
            console.error(`\x1b[31mError: Unknown argument: ${arg}\x1b[0m`);
            printUsage();
            process.exit(1);
        }
    }
    console.log(`Generating Material Expressive QR Code for: ${text}`);
    // Detect format from extension
    const ext = path_1.default.extname(outFile).toLowerCase().slice(1);
    const format = (ext === 'png' || ext === 'jpg' || ext === 'jpeg') ? ext : 'svg';
    try {
        const output = await (0, index_js_1.generateMDEQRCode)({
            text,
            logoUrl,
            fluidRadius,
            size,
            margin,
            primaryColor,
            backgroundColor,
            errorCorrectionLevel,
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
