# 🚀 Nova AI - Full-Stack Gemini Chatbox

A modern, production-ready AI Chatbox web application built with **React**, **Vite**, **Vercel Serverless Functions**, and the **Google Gemini REST API** (`gemini-1.5-flash`).

Designed with a clean white and soft purple aesthetic, complete mobile responsiveness, dark/light theme switcher, code block highlighting with one-click copying, and multi-turn conversational context.

---

## 🌟 Key Features

- **⚡ Google Gemini 1.5 Flash**: Lightning-fast responses powered by Google's flagship multimodal model.
- **🔒 Enterprise Security**: `GEMINI_API_KEY` is strictly held on the server inside a Vercel Serverless Function (`api/chat.js`). The secret key is **never** exposed to the browser or frontend bundle.
- **💬 Conversational Context**: Multi-turn dialogue history allows Nova to remember past messages in the session.
- **🎨 Premium UI/UX**: Clean white & lavender theme with dark mode toggle, smooth animations, and responsive layout for desktop, tablet, and mobile.
- **📋 One-Click Copy**: Copy complete AI responses or individual code snippets with visual checkmark feedback.
- **🛡️ Safe Formatting**: Safely parses Markdown bolding, bullet points, inline code, and fenced code blocks without using `dangerouslySetInnerHTML`, guaranteeing XSS protection.
- **🧹 Clear & New Chat**: Start fresh anytime with confirmation modals to prevent accidental history loss.
- **🚀 Vercel Ready**: Pre-configured with serverless functions and Vite build settings for one-click Vercel deployment.

---

## 📁 Project Structure

```
my-ai-chatbox/
├── api/
│   └── chat.js          # Vercel Serverless Function (Calls Google Gemini REST API)
├── public/              # Static assets
├── src/
│   ├── App.jsx          # Main React Application & UI components
│   ├── App.css          # Premium responsive styling (White & Soft Purple theme)
│   ├── index.css        # CSS variables, dark/light themes, typography
│   └── main.jsx         # React application root
├── .env.example         # Template for environment variables
├── .gitignore           # Excludes node_modules, dist, and secret .env files
├── index.html           # HTML5 entry with Google Fonts
├── package.json         # Project metadata and dependencies
├── README.md            # Documentation & deployment guide
├── vercel.json          # Vercel deployment configuration
└── vite.config.js       # Vite build & local development serverless middleware
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Pure CSS
- **Backend**: Vercel Serverless Functions (Node.js runtime)
- **AI Model**: Google Gemini 1.5 Flash (`gemini-1.5-flash`)
- **Hosting & Deployment**: Vercel
- **Source Control**: Git & GitHub

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Google Gemini API Key**: Free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Installation
Open your terminal in the project directory:

```bash
cd "C:\Users\Afroj\OneDrive\Desktop\my-ai-chatbox"
npm install
```

### 3. Configure Your Environment Variable
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```

### 4. Start Development Server
```bash
npm run dev
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.

---

## 🚢 Deploying to Vercel (Production)

### Option A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub (see instructions below).
2. Go to **[vercel.com](https://vercel.com)** and log in.
3. Click **"Add New..."** → **"Project"**.
4. Select your `my-ai-chatbox` GitHub repository and click **Import**.
5. Under **Environment Variables**, add:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `Your Google Gemini API Key`
6. Click **Deploy**. Vercel will build the React app and deploy the `api/chat.js` serverless function automatically!

---

## 🐙 Pushing to GitHub

To publish this project to a new GitHub repository:

1. Open your terminal in the project folder:
   ```bash
   cd "C:\Users\Afroj\OneDrive\Desktop\my-ai-chatbox"
   ```
2. Initialize Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Nova AI Chatbox with Gemini 1.5 Flash and Vercel Serverless"
   ```
3. Create a new repository on [GitHub](https://github.com/new) (e.g. named `my-ai-chatbox`).
4. Link your local repo and push (replace `<username>` with your GitHub username):
   ```bash
   git branch -M main
   git remote add origin https://github.com/<username>/my-ai-chatbox.git
   git push -u origin main
   ```

---

## 📄 License
MIT License. Built for learning, college project portfolios, and personal use.
