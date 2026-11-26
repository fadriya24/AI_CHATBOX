# Nova AI — Full-Stack Gemini Chatbox

A clean, modern AI Chatbox built with **React**, **Vite**, **CSS**, **Google Gemini API**, and **Vercel Serverless Functions**.

## Features

- **Real Google Gemini AI**: Powered by the official Google Gemini REST API through a secure Vercel Serverless Function (`api/chat.js`).
- **Protected API Key**: `GEMINI_API_KEY` stays strictly on the server via environment variables and is never exposed in frontend code.
- **Multi-Chat Conversation History**: Save, switch between, and delete conversations locally in the browser (`localStorage`), plus multi-turn context sent to Gemini.
- **Clean White & Soft Purple UI**: Responsive desktop & mobile layout, Dark/Light mode toggle, welcome screen with starter prompts, loading dots, and clear error messages with retry.
- **Keyboard & Clipboard Support**: `Enter` to send, `Shift + Enter` for a new line, automatic scrolling, clear-chat confirmation modal, and one-click copy for AI replies and code snippets.

---

## Project Structure

```text
my-ai-chatbox/
├── api/
│   └── chat.js                    # Vercel Serverless Function calling Gemini API
├── public/
│   └── favicon.svg                # App icon
├── src/
│   ├── components/
│   │   ├── ChatHeader.jsx         # Top bar with theme, new chat, and clear controls
│   │   ├── ChatInput.jsx          # Auto-resizing input with Enter / Shift+Enter
│   │   ├── ConfirmModal.jsx       # Clear chat confirmation modal
│   │   ├── FormattedMessage.jsx   # Safe Markdown & code block renderer
│   │   ├── MessageList.jsx        # Message bubbles, timestamps, copy, loading dots
│   │   ├── Sidebar.jsx            # Conversation history & theme controls
│   │   └── WelcomeScreen.jsx      # Starter prompt cards
│   ├── App.jsx                    # Main app state and API integration
│   ├── App.css                    # Responsive layout and component styles
│   ├── index.css                  # Light/dark CSS theme variables
│   └── main.jsx                   # React root
├── .env.example                   # Template for GEMINI_API_KEY
├── .gitignore                     # Protects .env*, node_modules, dist, .vercel
├── index.html                     # HTML entry page
├── package.json                   # Dependencies and scripts
├── vercel.json                    # Vercel build settings
└── vite.config.js                 # Vite config + local /api/chat dev handler
```

---

## Local Setup (Beginner Guide)

### 1. Get a Free Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **Create API key**.
3. Copy the key somewhere safe.

### 2. Install Dependencies
Open a terminal in the project folder and run:

```bash
npm install
```

### 3. Add Your Secret API Key Locally
1. Copy `.env.example` to `.env.local`:
   - **Windows PowerShell**:
     ```powershell
     Copy-Item .env.example .env.local
     ```
2. Open `.env.local` and paste your key:
   ```env
   GEMINI_API_KEY=your_real_gemini_api_key_here
   ```
   > **Important**: Never commit `.env.local` to GitHub. `.gitignore` already protects it.

### 4. Run Locally
You can run locally in two ways:

- **With Vite (`npm run dev`)**:
  ```bash
  npm run dev
  ```
  Open `http://localhost:3000`.

- **With Vercel CLI (`vercel dev`)**:
  ```bash
  npx vercel dev
  ```

### 5. Build for Production
```bash
npm run build
```

---

## GitHub Upload Commands (Beginner Guide)

Check `git status` first to make sure `.env.local` is **not** listed:

```bash
git status
git add .
git commit -m "Build Nova AI Gemini chatbox"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-ai-chatbox.git
git push -u origin main
```

---

## Deploying to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your `my-ai-chatbox` GitHub repository.
3. Open **Environment Variables** and add:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: your Google Gemini API key
4. Click **Deploy**. Vercel builds the Vite frontend and deploys `api/chat.js` automatically.
