# WindX - AI-Powered Code Assistant

WindX is a minimalist, high-performance AI assistant designed for developers. It provides real-time code analysis, debugging support, and visual architecture mapping through a sleek, unified interface.

![WindX Logo](https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/terminal/default/24px.svg)

## 🚀 Key Features

### 🧠 AI-Powered Actions (GPT-4o)
- **Analyze ⚡**: Deep technical assessment of code logic, edge cases, and safety.
- **Smart Debug 🛠️**: Traces errors, identifies the most likely root cause, and proposes confident fixes.
- **Generate Tests 🧪**: Instantly creates comprehensive unit test suites with mock data.
- **Optimize 🚀**: Refactors code for peak performance, readability, and modern clean-code standards.

### 🔄 Interactive Smart Diff
- **Before/After View**: Automatically compares suggested changes side-by-side.
- **Hunk Control**: Toggle **Accept/Reject** on specific parts of a code change.
- **Apply to Editor**: Sync accepted improvements directly to your live workspace with one click.

### 🎨 Visual Intelligence
- **Flow Diagrams**: Renders real-time **Mermaid.js** flowcharts from your functions.
- **System Architecture**: Generates high-level visual maps of services and data paths.

### 📸 Advanced Input & OCR
- **OCR Error Extraction**: Upload a screenshot of a terminal error; WindX extracts the text and starts a debug session instantly.
- **Voice Input 🎤**: Speak to your code assistant for hands-free workflow.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Modern Glassmorphism), JavaScript.
- **Backend**: Node.js (v18+), Express.
- **AI Engine**: OpenRouter API.

## ⚙️ Setup & Deployment

### Local Development
1. **Clone & Install**:
   ```bash
   git clone https://github.com/kavindidewmininavodya/AI-Code-Assistant.git
   npm install
   ```
2. **Environment Variables**: Create a `.env` file:
   ```env
   OPENROUTER_API_KEY=your_key
   PORT=3000
   ```
3. **Run**: `npm run dev`

### 🚀 Deploy to Vercel (Recommended)
1. Push your code to GitHub.
2. Connect your repo to [Vercel](https://vercel.com).
3. **Crucial**: Go to Settings -> Environment Variables and add your `OPENROUTER_API_KEY`.
4. Deploy! Vercel will use the included `vercel.json` to handle routing.

### 🚀 Deploy to Render
1. Create a "Web Service" on [Render](https://render.com).
2. Set **Build Command** to `npm install`.
3. Set **Start Command** to `node server.js`.
4. Add your `OPENROUTER_API_KEY` in the Environment section.

## 📄 License
ISC License.
