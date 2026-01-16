<div align="center">

<img src="./frontend/public/aura-logo.png" alt="Aura Logo" width="150" />

# 📚 Aura

**AI-powered spaced repetition platform that helps students retain information through intelligent quiz generation and personalized learning schedules.**

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-ISC-green)

</div>

## 🎯 What is Aura?

Aura combines AI and spaced repetition science to help students learn smarter, not harder. Upload your study materials, and Aura will:
- Generate intelligent quizzes from your content
- Schedule reviews at optimal intervals for memory retention
- Track your progress and adapt to your learning patterns

## 🖼️ Screenshots

<!-- Add your screenshots here -->
<!-- ![Dashboard](./screenshots/dashboard.png) -->
<!-- ![Quiz Interface](./screenshots/quiz.png) -->

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, TailwindCSS, Framer Motion, Three.js |
| **Backend** | Node.js, Express, LangChain |
| **AI/ML** | Gemini, Groq, OpenRouter, Pinecone (vector DB) |
| **Database** | Supabase (PostgreSQL + Auth) |
| **AI Engine** | Python, Flask |

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- Python 3.8+
- npm or yarn

### 1. Clone & Setup
```bash
git clone https://github.com/your-username/Aura.git
cd Aura
npm run setup
```

### 2. Configure Environment
After setup, edit the `.env` files with your API keys:

```env
# Required API Keys
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
GROQ_API_KEY=your_groq_api_key
```

### 3. Run the Application

**Terminal 1 - Frontend:**
```bash
cd frontend && npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend-js && npm run dev
```

### 4. Access the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📁 Project Structure

```
Aura/
├── frontend/          # React + Vite frontend
├── backend-js/        # Node.js/Express API server
├── ai-engine/         # Python ML/NLP engine
└── .kiro/             # Spec-driven development docs
```

## 👥 Built By

<!-- Add your team members here -->
- **Your Name** - [GitHub](https://github.com/yourusername)

---

*Built for [Hackathon Name] 2026*
