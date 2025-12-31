# Wally Atkins' Portfolio Website

A modern, interactive personal portfolio website built with React, TypeScript, and Vite. Features a playful "Creative Mode" with hidden Easter eggs, a custom Snake game, and a secure PHP contact backend.

## 🚀 Key Features

- **Modern Tech Stack**: React 19, TypeScript, Vite 7.
- **Creative Mode**: Toggle between a professional minimalist view and a whimsical creative interface.
- **Easter Eggs**: Hidden interactive elements including:
  - **Snake Game**: A fully playable classic Snake game (Unlock via D-Pad).
  - **Fhqwhgads**: A tribute to Homestar Runner (Typed secret).
  - **Zoltar**: Interactive fortune teller (Mouse gesture).
  - See [EASTER.md](./EASTER.md) for full details.
- **Secure Contact Form**: PHP backend (`pine.php`) with honeypot and time-trap spam protection.
- **Responsive Design**: Optimized for all devices with specific mobile enhancements.

## 📂 Project Structure

- **`src/`**: React frontend source code.
  - `components/`: Reusable UI components and Easter egg logic.
  - `context/`: State management (e.g., `EasterEggContext`).
- **`public/`**: Static assets served directly (images, SWF files).
  - `.htaccess`: Apache configuration for SPA routing and backend access.
  - `pine.php`: Backend logic (copied to root of `dist` during build).
- **`dist/`**: Production build output (Deploy this folder).
- **`.devcontainer/`**: Docker configuration for a consistent local development environment.
- **`tests/`**: Playwright End-to-End tests.

## 🛠️ Getting Started

### Recommended: DevContainer (Docker)
This project includes a DevContainer configuration that closely simulates the production environment (Apache/PHP).

1. Ensure **Docker Desktop** is running.
2. Open the project in **VS Code**.
3. Click "Reopen in Container" when prompted (or use the Command Palette).
4. Inside the container:
   - **Build**: `npm run build` (Generates `dist/` and copies backend files).
   - **Serve**: The Apache server automatically serves the `dist/` folder at `http://localhost:8080`.
   - **Routing**: `.htaccess` rules are active, simulating the live server.

### Manual Setup (Node.js)
If you prefer running without Docker:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   *Note: The PHP contact form (`pine.php`) will not work in this mode as Vite Dev Server does not process PHP.*

## 📦 Building for Production

To create a production build ready for deployment:

```bash
npm run build
```

This command:
1. Compiles TypeScript and builds the React app using Vite.
2. Optimizes assets.
3. Copies `pine.php` from root to `dist/`.

**Deployment**: Upload the contents of the `dist/` directory to your web server's `public_html` folder.

## 🧪 Testing

The project uses **Playwright** for End-to-End testing.

```bash
npx playwright test
```

Tests cover:
- Easter egg triggers (Konami code, gestures, typing).
- Game functionality (Snake, Block Blast).
- Creative mode toggles.
- Contact form submission (mocked).

## 📄 License
Private (© Wally Atkins)
