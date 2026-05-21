<div align="center">

# MDE-QRCode

**A Google Material Design 3 Expressive style QR Code generator for Node.js**

Generate beautiful, rounded QR codes with fluid corners, customizable colors, and optional logo embedding.

<img src="showcase.png" alt="MDE QR Code Showcase" width="280" />

<sub>Generated with default parameters · `--text "Hello MDE QRCode Generator"`</sub>

</div>

---

## ✨ Features

- **Expressive Rounded Modules** — Smooth, fluid corners following Material Design 3 principles
- **Fluid Corner Rounding** — Two independent radius controls: outer convex corners (`--radius`) and inner connected corners (`--radius2`)
- **M3 Finder Patterns** — Squircle-style finder eyes with concentric circles
- **Logo Embedding** — Automatic module clearing with circular clipping for center logos
- **Multiple Formats** — Export as SVG, PNG, or JPEG
- **Full Customization** — Colors, size, margin, error correction level, and more

## 📦 Installation

```bash
npm install
```

## 🚀 Usage

### CLI

```bash
# Basic — generate with default settings
npm start -- --text "https://example.com" --out my_qr.svg

# Custom styling
npm start -- --text "https://google.com" --out google.png --primary "#4285F4" --radius 0.8 --radius2 0.2

# With a logo
npm start -- --text "https://github.com" --out github.svg --logo "logo.png"

# Show all available options
npm start -- --help
```

> You can also run directly with `node dist/cli.js` instead of `npm start --`.

### Library

```typescript
import { generateMDEQRCodeSVG, generateMDEQRCode } from 'mde-qrcode';

// Generate SVG string
const svg = await generateMDEQRCodeSVG({
  text: 'https://github.com/origami-suki/MDE-QRCode',
  primaryColor: '#6750A4',
  backgroundColor: '#FEF7FF',
  fluidRadius: 1.0,
  fluidRadius2: 0.15,
});

// Generate PNG buffer
const pngBuffer = await generateMDEQRCode({
  text: 'https://example.com',
  size: 1024,
}, 'png');
```

## ⚙️ Options

| Option | CLI Flag | Type | Default | Description |
|--------|----------|------|---------|-------------|
| `text` | `--text` | `string` | `"https://github.com/origami-suki/MDE-QRCode"` | Text or URL to encode |
| `size` | `--size` | `number` | `512` | Output image width/height in pixels |
| `margin` | `--margin` | `number` | `4` | Quiet zone margin in cell modules |
| `fluidRadius` | `--radius` | `float` | `1.0` | Outer corner roundness (`0.0` = square, `1.0` = circle) |
| `fluidRadius2` | `--radius2` | `float` | `0.15` | Connected inner corner roundness (`0.0` – `1.0`) |
| `primaryColor` | `--primary` | `string` | `"#1D1B20"` | Module fill color |
| `backgroundColor` | `--bg` | `string` | `"#FFFFFF"` | Background color |
| `errorCorrectionLevel` | `--level` | `L\|M\|Q\|H` | `"H"` | Error correction level |
| `logoUrl` | `--logo` | `string` | — | URL or path to a center logo image |
| — | `--out` | `string` | `"qrcode.svg"` | Output file path (extension determines format) |

## 📄 License

MIT
