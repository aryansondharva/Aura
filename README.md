<div align="center">

<img src="./frontend/src/assets/recallo.png" alt="Aura Logo" width="150" />

---

**An AI-driven learning companion designed to transform study materials into interactive and resumable learning experiences.**

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://techassasin.vercel.app/)
[![Render Deployment](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://aura-s7ho.onrender.com)
![Version](https://img.shields.io/badge/version-1.1.0-gold)
![License](https://img.shields.io/badge/license-ISC-green)

</div>

---

## Project Overview

Aura is a state-of-the-art educational platform that combines Deep Analysis AI with personalized learning. By processing uploaded PDF documents, Aura generates a comprehensive database of knowledge that facilitates long-term memory retention.

### Key Features
- **Resumable Chat and History**: Persistent storage of PDF-based conversations and quiz history allows users to maintain progress across sessions.
- **Data-Driven Performance Analysis**: Interactive performance tracking through analytical charts and historical score data.
- **Secure OTP Verification**: Robust mobile-based One-Time Password verification system integrated via Twilio for enhanced account security.
- **Dual-Mode Profile Management**: Comprehensive user settings dashboard featuring distinct viewing and editing interfaces for better data integrity.
- **Automated MCQ Generation**: Intelligent quiz creation utilizing structured JSON formatting for high-reliability parsing and consistent UI rendering.
- **Notification Management**: Integrated granular controls for enabling or disabling automated email alerts and study reminders.

---

## Technical Specifications

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, Lucide Icons, Recharts, Framer Motion |
| **Backend** | Node.js (ESM), Express, LangChain JS |
| **AI/LLM** | Google Gemini (Pro & Flash), HuggingFace (Embeddings) |
| **Security** | Twilio SMS API, Supabase Auth |
| **Database** | Supabase (PostgreSQL), pgvector for Semantic Search |

---

## Deployment Information

- **Production Frontend**: [techassasin.vercel.app](https://techassasin.vercel.app/)
- **Production API Gateway**: [aura-s7ho.onrender.com](https://aura-s7ho.onrender.com)

---

## Project Architecture

```bash
Aura/
├── frontend/              # Optimized Vite + React App
│   ├── src/
│   │   ├── components/    # Reusable UI Components
│   │   ├── pages/         # Core Application Views
│   │   └── utils/         # Auth and Session management
│
├── backend/               # Scalable Node.js API Infrastructure
│   ├── src/
│   │   ├── routes/        # Feature-specific route definitions
│   │   ├── services/      # AI and PDF processing logic
│   │   └── config/        # Centralized Environment Configuration
│
└── full_schema.sql        # Core Database and RLS Policy definitions
```

---

## Environment Configuration

To initialize the Aura environment, maintain the follow variables in the respective .env files:

### Backend (.env)
- SUPABASE_URL
- SUPABASE_KEY
- GEMINI_API_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_PHONE_NUMBER
- FRONTEND_PROD

### Frontend (.env)
- VITE_BACKEND_URL
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

---

<div align="center">

**Repository Star is appreciated if this project is beneficial to your work.**

Developed by 💖 Tech Assassin.

</div>
