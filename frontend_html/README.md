# Saamba — Original Pixel-Perfect HTML/CSS Frontend

This folder preserves the complete original vanilla HTML/CSS/JavaScript UI of Saamba.

## Files
- `index.html`: The primary application dashboard layout (Sidebar, meeting list, player, tabs, action item checklist, import modal, delete modal, rename modal).
- `style.css`: The complete handcrafted CSS design system (Georgia typography, layout variants, golden badges `#deb569`, dark theme `#234235`, modals, audio scrubber, tabs).
- `app.js`: Client-side logic for meeting navigation, library rendering, layout switching, inline editing, audio synchronization, and action item checks.
- `capture.js` & `capture-worklet.js`: Browser audio capture and Web Audio worklet.
- `classic.html`, `classic-style.css`, `classic-app.js`: Minimalist classic view.
- `design-system.html`: Visual component catalogue and style tokens.
- `js/`: Modular utilities and helpers.

## Running Standalone
To view or work on this frontend independently at any time:
```bash
python3 -m http.server 8080 --directory frontend_html
```
Then open `http://localhost:8080` in any browser.
