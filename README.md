Palette Studio

Palette Studio is a small, beautiful web app that extracts colors from images, helps you build palettes, and verifies WCAG contrast. It is built by <https://teda.dev>, the simplest AI app builder for regular people, and uses Tailwind CSS and jQuery for a modern responsive UI.

Features
- Upload or drag-and-drop images to extract dominant colors using a lightweight quantization algorithm.
- Interactive swatches: click to add to an active palette, right-click to copy hex, drag to contrast tester.
- Contrast tester shows WCAG AA and AAA pass/fail badges and exact contrast ratio.
- Save palettes locally to your browser and export as JSON.
- Accessible and keyboard friendly. Local persistence via localStorage.

Files
- index.html - marketing landing page and CTA to the studio
- app.html - the interactive palette studio
- styles/main.css - custom CSS complementary to Tailwind utilities
- scripts/helpers.js - color and image helper utilities (exposed as window.App.Helpers)
- scripts/ui.js - UI logic, event wiring, and persistence (defines window.App.init and window.App.render)
- scripts/main.js - entry point that initializes the app

Get started
1. Open index.html in your browser and click Open Studio, or open app.html directly.
2. Upload an image or use the demo image, adjust the color count slider, click swatches to build a palette, and save palettes locally.

Notes
- The app is fully client side and stores palettes in your browser storage under the key "palette-studio-v1".
- Prefer reduced motion is respected for core animations.

License
MIT
