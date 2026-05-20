# MDE-QRCode

A Google Material Design 3 (M3) Expressive style QR Code generator for Node.js.

## Features
- **Expressive Style**: Rounded modules and finders following Material 3 principles.
- **M3 Colors**: Default palettes based on Material 3 tokens.
- **Logo Support**: Automatic module clearing and logo embedding.
- **SVG Output**: High-quality vector graphics.

## Installation
```bash
npm install
```

## Usage
### CLI
```bash
npm start -- "Your text here" output.svg "optional-logo-url"
```

### Library
```typescript
import { generateMDEQRCodeSVG } from './index.js';

const svg = await generateMDEQRCodeSVG({
  text: 'https://github.com/origami-suki/MDE-QRCode',
  primaryColor: '#6750A4',
  backgroundColor: '#FEF7FF',
  logoUrl: 'https://example.com/logo.png'
});
```

## License
MIT
