# Neon Translate Pro

A modern multi-page translator web app built with pure **HTML, CSS, and JavaScript**.  
It includes a futuristic tech UI, live animations, sidebar navigation, assistant popup, translation tools, voice input, OCR simulation, history, favorites, and download features.

## Features

- Multi-page dashboard-style UI.
- Dark tech-professional theme.
- Glassmorphism cards with blur and transparency.
- Sidebar navigation with active page switching.
- Floating background animation and 3D tilt effect.
- API-based translation support with custom endpoint, key, and region.
- Auto translate while typing with debounce.
- Language dropdowns and swap button.
- Voice input using Web Speech API.
- Text-to-speech output with selectable voice, rate, and pitch.
- Clipboard copy for input and output text.
- URL text fetch for webpage content.
- Image upload OCR simulation.
- Camera OCR simulation using browser camera access.
- Live word count, character count, and reading time.
- Basic language detection.
- Basic summarization.
- Favorites stored in localStorage.
- Translation history stored in localStorage.
- Searchable history and favorites panels.
- Download translated text as TXT.
- Download report as JSON.
- Toast notifications for user actions.
- Small assistant popup for quick navigation help.
- Responsive layout for desktop and mobile.

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
