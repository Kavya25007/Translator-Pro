# Translate Pro

A modern multi-page translator web app built with pure **HTML, CSS, and JavaScript**.  
It includes a futuristic tech UI, live animations, sidebar navigation, assistant popup, translation tools, voice input, OCR simulation, history, favorites, and download features.

## Features


### 🧭 UI / UX
- Multi-page dashboard-style layout
- Dark futuristic tech theme
- Glassmorphism UI (blur + transparency)
- Sidebar navigation with active page switching
- Floating animated background effects
- 3D hover tilt interactions
- Fully responsive design (desktop + mobile)

---

### 🌍 Translation System
- Real API-based translation support (custom endpoint)
- Auto-translate while typing (debounced)
- Language selection with swap functionality
- Basic language detection support
- Custom API key + region configuration

---

### 🎤 Voice & Audio
- Speech-to-text input (Web Speech API)
- Text-to-speech output (voice selection, speed, pitch control)
- Microphone-based live input

---

### 📷 OCR & Input Tools
- Image upload OCR simulation
- Camera-based OCR simulation (getUserMedia API)
- URL text extraction from webpages
- Clipboard copy/paste support

---

### 📊 Smart Utilities
- Live word, character, and reading time counter
- Translation history (stored in localStorage)
- Favorites system (save important translations)
- Searchable history & favorites

---

### 💾 Export & Save
- Download translated text as `.txt`
- Export full report as `.json`
- Persistent storage using localStorage

---

### 🤖 Assistant Features
- Floating assistant popup
- Quick navigation help
- Fast page switching shortcuts

---

## Folder Structure

```txt
translator-web-app/
├── index.html
├── styles.css
├── script.js
└── README.md
```

## Requirements

- A modern browser such as Chrome, Edge, or Firefox.
- Internet access if you want to use a remote background video or API endpoint.
- A valid translation API endpoint if you want real API translation.
- Microphone permission for voice input.
- Camera permission for camera OCR simulation.

## Browser APIs Used

This project uses built-in browser APIs where available:

- `localStorage` for saving settings, history, and favorites.
- Web Speech API for speech recognition and text-to-speech.
- Clipboard API for copy and paste actions.
- `getUserMedia()` for camera capture.
- `fetch()` for loading webpage text and calling translation APIs.

These APIs are supported through standard browser features and storage mechanisms [web:48][web:10][web:12][web:3].

## How to Run

1. Create a project folder.
2. Add these files:
   - `index.html`
   - `styles.css`
   - `script.js`
3. Open `index.html` in a browser.
4. If you use a local video or image background, place them inside an `assets/` folder.
5. For best results, run the project with a local server instead of opening the file directly.

## Using a Local Server

If you have VS Code, install the Live Server extension and open the project with it.  
You can also use any simple HTTP server.

Example:

```bash
python -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

## How to Use

### Translate Text
- Select source and target languages.
- Type or paste text into the input box.
- Click **Translate** or enable auto translate.

### Voice Input
- Click **Start Voice**.
- Speak clearly into your microphone.
- The text appears in the input box automatically.

### OCR Simulation
- Upload an image or use the camera feature.
- The app simulates OCR and places extracted text in the input.

### URL Import
- Paste a webpage URL.
- Click **Fetch URL** to load visible text from the page.

### History and Favorites
- Open the **History** page from the sidebar.
- Search, export, or clear saved translations.
- Save output to favorites for quick access later.

### Assistant Popup
- Click the `?` assistant button.
- Use it to jump to important pages quickly.

## Notes

- OCR is simulated because true OCR usually needs an external OCR engine or API.
- URL fetch may fail on websites that block cross-origin requests.
- Voice recognition support depends on the browser.
- Camera access requires user permission.

## Customization

You can easily customize:
- Theme colors.
- Background video or images.
- Translation API endpoint.
- Sidebar menu labels.
- Assistant popup messages.
- Animation intensity.

## Example API Payload

If you connect a real translation backend, the app sends data like this:

```json
{
  "q": "Hello world",
  "source": "en",
  "target": "es",
  "mode": "normal",
  "apiKey": "your-api-key",
  "region": "global",
  "provider": "custom"
}
```

## Known Limitations

- Real translation depends on your API endpoint.
- OCR is only simulated in the current frontend-only version.
- Some browser APIs require HTTPS or localhost.
- Cross-origin page fetching can be blocked by browser security rules.

## License

Free to use and modify for learning, personal projects, and portfolio work.
