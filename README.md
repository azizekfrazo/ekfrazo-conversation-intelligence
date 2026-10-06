# Ekfrazo Conversation Intelligence

> AI workspace for pharma sales readiness, practice, and coaching

**Ekfrazo Technologies** · Built with React + Vite + Node.js + Prisma + OpenAI

---

## Overview

A full-stack demo platform for pharmaceutical sales representatives to:

1. **Pre-Call Battlecard** — AI generates tailored call prep based on a doctor's persona and concerns
2. **Doctor Objection Simulator** — Voice-mode roleplay with an AI that stays in the doctor's role (WebRTC + OpenAI Realtime)
3. **Post-Call Coach** — Paste or upload a meeting transcript; AI generates coaching analysis, follow-up email, CRM note, and manager summary

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query v5, React Router v6 |
| UI Components | Radix UI primitives (shadcn/ui style), lucide-react, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite + Prisma ORM |
| AI | OpenAI GPT-4o (text), OpenAI Realtime API (voice via WebRTC) |
| Validation | Zod |

---

## Project Structure

```
/
├── package.json          # root dev scripts
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts       # demo data
│   └── src/
│       ├── index.ts      # Express app
│       ├── routes/       # all API routes
│       ├── prompts/      # AI prompt builders
│       ├── lib/          # prisma client
│       └── middleware/   # error handling
└── client/
    └── src/
        ├── pages/        # all screens
        ├── components/   # UI + feature components
        ├── hooks/        # data fetching hooks
        ├── lib/          # api client, auth, utils
        └── types/        # shared TypeScript types
```

---

## Setup

### Prerequisites
- Node.js 18+
- An OpenAI API key (GPT-4 access required; Realtime API for voice)

### 1. Install dependencies

```bash
npm install
npm install --prefix server
npm install --prefix client
```

Or using the root script:
```bash
npm run install:all
```

### 2. Configure environment

Copy and fill in the server env file:
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```
OPENAI_API_KEY=sk-...your-key...
DATABASE_URL="file:./dev.db"
PORT=4000
APP_ORIGIN=http://localhost:5173
```

### 3. Set up the database

```bash
npm run db:push    # creates the SQLite database
npm run db:seed    # seeds demo data
```

### 4. Run the app

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Health check**: http://localhost:4000/api/health

---

## Using the Demo

### Login
Click **"Enter as Demo Sales Rep"** — logs in as `Arjun Kapoor`.

### Demo Flow
1. Go to **Doctor Profiles** → select **Dr. Ananya Krishnamurti**
2. Click **Battlecards** tab → **Generate Battlecard** (needs OpenAI key)
3. Click **Practice** tab → configure difficulty/objection → **Start Voice Practice**
4. After ending, auto-generates a practice report with scores and coaching
5. Go to **Post-Call** tab → click a demo transcript or paste your own → **Analyze Transcript**
6. Review the analysis, follow-up email draft, and CRM notes

### Pre-seeded Data
- 5 doctor profiles (Cardiologist, Diabetologist, Oncologist, Neurologist, GP)
- 4 fictional pharma products (Cardovix, Glytara, Nexovir, Alzara)
- 1 battlecard (Cardovix for Dr. Krishnamurti)
- 2 completed practice sessions with full reports
- 3 realistic demo transcripts
- 1 completed post-call analysis

---

## Voice Simulator

The voice simulator uses the **OpenAI Realtime API** over WebRTC.

**How it works:**
1. Server creates an ephemeral session token via `POST /api/realtime/session`
2. Client opens a `RTCPeerConnection` directly to OpenAI Realtime
3. Microphone audio is streamed; AI doctor audio plays back via browser
4. Live transcript appears from transcription events on the data channel

**Requirements:**
- `OPENAI_API_KEY` must have access to the Realtime API (`gpt-4o-realtime-preview`)
- Browser microphone permissions required (or use the text fallback)
- Chromium-based browser recommended for WebRTC

**Text fallback:** If mic access is denied, a text input field appears for typing responses.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key with GPT-4 + Realtime access | — |
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `PORT` | Backend server port | `4000` |
| `APP_ORIGIN` | Frontend origin for CORS | `http://localhost:5173` |

---

## Prisma Commands

```bash
npm run db:push     # sync schema to SQLite (dev)
npm run db:seed     # run seed script
npm run db:studio   # open Prisma Studio (visual DB editor)
npm run db:reset    # reset and re-seed database
```

---

## Development Scripts

From the **root** directory:

| Script | Description |
|---|---|
| `npm run dev` | Run server + client concurrently |
| `npm run build` | Build server and client for production |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset + reseed database |

---

## Troubleshooting

**"Demo user not found" on login:**
→ Run `npm run db:seed`

**Voice session won't connect:**
→ Check `OPENAI_API_KEY` is set in `server/.env`
→ Ensure your key has Realtime API access
→ Try Chrome/Edge (WebRTC support is best there)
→ Use the text input fallback if mic fails

**Build errors:**
→ Ensure Node.js 18+ (`node -v`)
→ Delete `node_modules` and re-run `npm install`

**Database errors:**
→ Run `npm run db:reset` to wipe and reseed

---

## Compliance Note

This platform is designed for **coaching, preparation, and practice purposes only**. It is not intended for use as a hidden overlay during live doctor conversations. All AI-generated content is labeled as suggested discussion material. Final field messaging must follow approved medical, legal, and regulatory guidance from your organisation.

---

*Built by Ekfrazo Technologies*
