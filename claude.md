You are a senior full-stack engineer and product designer.

Build a complete full-stack demo app for a pharma sales conversation intelligence platform.

## Product owner
This product belongs to Ekfrazo Technologies.

## Product purpose
The app helps pharma sales reps prepare for doctor meetings, practice objections with an AI doctor in voice mode, and analyze post-call transcripts for coaching and next actions.

## IMPORTANT product framing
This app must NOT be framed as a hidden or deceptive “cheat overlay” for live doctor conversations.
It should be framed as a visible, compliant, assistant-style coaching and preparation platform.
The product includes:
1. Pre-Call Battlecard
2. Doctor Objection Simulator (voice mode)
3. Post-Call Coach

## Tech stack
Use:
- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- State/data: TanStack Query
- Routing: React Router
- Icons: lucide-react
- Animation: Framer Motion (subtle only)
- Backend: Node.js + Express + TypeScript
- DB: SQLite + Prisma
- Validation: Zod
- AI: OpenAI API
- Voice mode: OpenAI Realtime over WebRTC for browser-based low-latency voice sessions
- Environment: .env files for backend and frontend as needed

## Build goals
I want a polished, demo-ready monorepo app with:
- clean architecture
- working CRUD
- seeded demo data
- persistent chat history
- simple setup
- refined UI
- realistic demo workflows
- all screens inside one coherent product
- no unnecessary complexity

## Product name
Use a professional product name:
“Ekfrazo Conversation Intelligence”
Subtitle:
“AI workspace for pharma sales readiness, practice, and coaching”

## Overall UX concept
The app should feel like an enterprise-grade but modern product:
- simple
- minimal
- fast
- clean
- card-based
- lots of whitespace
- easy to demo live

## Theme and branding
Use a clean pharmaceutical enterprise look inspired by Dr. Reddy’s style:
- primary purple: #4B2A91
- light lavender backgrounds
- clean white cards
- subtle shadows
- rounded-xl components
- modern typography
- avoid flashy gradients
- overall look should feel premium, calm, trustworthy, and compliant

Use Ekfrazo Technologies branding in the app header/footer:
- Top-left app logo area text:
  Ekfrazo Technologies
- Product label:
  Ekfrazo Conversation Intelligence

## Monorepo structure
Create:
- /client
- /server
- /prisma
- root package.json with scripts
- clear README with setup instructions

## Required app areas

### 1. Authentication
Keep it simple for demo:
- no real auth provider
- create a fake local session login
- demo user selection or simple “Enter as Demo Sales Rep”
- store session in localStorage
- include one seeded rep user

### 2. Doctor Profile Workspace (this is the entry point)
This is the most important requirement.

The user must first create or select a doctor profile before the three main workflows are enabled.

Create a Doctor Workspace system:
- Doctor list page
- Create doctor modal/page
- Doctor detail workspace page

Doctor profile fields:
- id
- fullName
- specialty
- city
- hospitalOrClinic
- personaType
- seniorityLevel
- therapyArea
- targetProduct
- likelyConcerns (array/string tags)
- competitorPreference
- lastInteractionDate
- notes
- createdAt
- updatedAt

PersonaType enum examples:
- Skeptical
- EvidenceDriven
- PriceSensitive
- BrandLoyal
- Busy
- FriendlyButReserved

If no doctor is selected:
- battlecard module disabled
- simulator disabled
- post-call coach disabled
Show a clear empty state:
“Select or create a doctor profile to unlock readiness workflows.”

### 3. Dashboard
Create a top-level dashboard with:
- total doctors
- upcoming meeting prep cards
- recent practice sessions
- recent post-call analyses
- quick actions
- product overview cards

### 4. Pre-Call Battlecard Module
This is the first demo flow.

Behavior:
- user opens a doctor workspace
- clicks “Generate Battlecard”
- backend uses doctor context + product data to generate a battlecard
- store result in DB
- show in a clean battlecard UI

Input sources:
- doctor profile
- product profile
- optional rep notes

Output should include:
- likely doctor questions (3-5)
- suggested responses
- talking points
- objections to anticipate
- what not to say
- one-line pitch
- confidence checklist before meeting

Battlecard UI:
- card sections
- copy buttons
- regenerate button
- save button
- history tab for older battlecards

### 5. Product and Therapy Data
Create simple seeded data tables:
Product fields:
- id
- productName
- therapyArea
- indication
- keyBenefits
- sideEffects
- differentiators
- competitorNames
- approvedClaims
- disclaimers
- createdAt
- updatedAt

Seed 3-5 realistic but fictional products.
Do NOT use actual regulated claims that could be risky.
Use believable fictional pharma-style data for demo.

### 6. Doctor Objection Simulator (voice mode)
This is the wow demo feature.

Goal:
A rep practices with an AI doctor in voice mode.
The AI must stay in the DOCTOR role only.
The rep speaks naturally.
The app shows live transcript and session status.
At the end, it creates a practice report.

Implementation requirements:
- browser mic access
- backend endpoint to create secure realtime session
- frontend uses WebRTC
- session instructions force AI into doctor role
- selectable scenario difficulty:
  - Easy
  - Medium
  - Hard
- selectable doctor objection type:
  - Efficacy
  - Safety
  - Side effects
  - Cost
  - Competitor comparison
  - Patient adherence
- persona should be derived from selected doctor profile

Important:
The AI should sound like a real doctor in a roleplay setting.
The AI should challenge the rep with realistic objections.
The AI should not break character unless session ends.

Voice simulator UI:
- start session button
- end session button
- mic status indicator
- connected/disconnected indicator
- elapsed time
- live transcript panel with speaker labels
- right panel showing doctor persona card
- quick scenario details
- optional text fallback input if mic fails

Save all session data:
- transcript
- duration
- difficulty
- objection focus
- timestamps

### 7. Practice Session Report
After the simulator ends, automatically generate a structured report:
- summary
- rep strengths
- weak moments
- missed opportunities
- objection handling quality score
- clarity score
- confidence score
- compliance-mindedness score
- recommended improvements
- 3 next practice suggestions

Keep scoring heuristic and explanatory, not pseudo-scientific.
Store report in DB.
Show printable clean report page.

### 8. Post-Call Coach
This is the third demo flow.

User can:
- paste meeting transcript
- upload plain text transcript
- optionally upload demo transcript text file

Then backend analyzes using doctor context and product context.

Outputs:
- conversation summary
- key doctor concerns raised
- what went well
- what could be improved
- missed moments
- likely doctor intent
- recommended next best actions
- suggested follow-up email
- CRM-ready summary notes
- manager-ready coaching summary

Store analysis in DB and show in a neat report view.

### 9. Chat / History
I want everything in one place.

Build persistent history:
- doctor-specific timeline
- saved battlecards
- practice sessions
- post-call analyses
- notes
- chat messages related to that doctor

Implement:
ConversationThread
Message

Chat UI:
- clean threaded panel
- timestamps
- message roles
- scrollable timeline
- ability to reopen historical outputs

### 10. Notes and Timeline
For each doctor workspace create a right-side timeline:
- doctor created
- battlecard generated
- simulator practiced
- transcript analyzed
- note added

### 11. Demo transcripts
Seed 3-5 realistic demo transcripts.
These should feel realistic but remain fictional.
Examples:
- cardiologist asks about side effects and competitor
- diabetologist raises adherence and pricing concerns
- oncologist asks for evidence depth

### 12. Safety and compliance product behavior
Even though this is a demo app, include guardrails:
- avoid exaggerated marketing claims
- use language like “suggested discussion points”
- include a small UI disclaimer:
  “For demo and coaching purposes. Final field messaging should follow approved medical, legal, and regulatory guidance.”
- avoid creating hidden/covert overlays
- position system as preparation/practice/coaching software

## Database schema requirements
Use Prisma with SQLite.

Models to include:
- User
- DoctorProfile
- Product
- Battlecard
- PracticeSession
- PracticeTurn
- PracticeReport
- MeetingTranscript
- PostCallAnalysis
- ConversationThread
- Message
- Note

Include:
- relations
- createdAt/updatedAt
- seed script

## API routes
Build clean REST endpoints.

Suggested endpoints:
- GET /api/health
- GET /api/doctors
- POST /api/doctors
- GET /api/doctors/:id
- PUT /api/doctors/:id
- DELETE /api/doctors/:id

- GET /api/products
- GET /api/products/:id

- POST /api/battlecards/generate
- GET /api/doctors/:id/battlecards

- POST /api/practice/session
- POST /api/practice/session/:id/report
- GET /api/doctors/:id/practice-sessions

- POST /api/postcall/analyze
- GET /api/doctors/:id/postcall-analyses

- GET /api/doctors/:id/timeline
- POST /api/doctors/:id/notes

- POST /api/realtime/session
This route securely creates the realtime voice session on the backend.

## AI prompt design
Create server-side prompt builders for:
1. Battlecard generation prompt
2. Doctor simulator system prompt
3. Practice report prompt
4. Post-call analysis prompt

### Battlecard prompt behavior
- use doctor persona
- use product data
- create short useful sections
- focus on practical rep coaching
- avoid unsupported claims

### Doctor simulator system prompt behavior
- act as a doctor only
- maintain role consistency
- ask realistic questions
- challenge weak responses
- use selected persona and objection type
- do not provide the rep the answer
- do not break role unless session closes

### Practice report prompt behavior
- analyze transcript fairly
- highlight strengths and gaps
- create practical recommendations
- produce structured JSON if helpful

### Post-call coach prompt behavior
- summarize
- identify concerns
- recommend next actions
- suggest follow-up
- produce concise sections useful for sales workflows

## UI requirements
Screens:
1. Login / enter demo
2. Dashboard
3. Doctor list
4. Create/Edit doctor
5. Doctor workspace
6. Battlecard detail
7. Simulator page
8. Practice report page
9. Post-call upload/analyze page
10. Analysis detail page

### Doctor workspace layout
Use a 3-column layout:
- left: doctor details + quick actions
- center: main module content
- right: timeline / notes / recent outputs

Tabs within doctor workspace:
- Overview
- Battlecards
- Practice
- Post-call
- History
- Notes

### Design characteristics
- very clean
- simple cards
- top navbar
- left sidebar nav
- responsive desktop-first
- no clutter
- polished empty states
- productized feel
- easy demo navigation

## Seed data requirements
Create:
- 1 seeded demo sales rep
- 5 doctor profiles
- 4 fictional pharma products
- 5 battlecard-ready scenarios
- 3 realistic post-call transcript samples
- 2 historical practice sessions
- 1 example post-call analysis

## Demo-first behavior
Make the app extremely demo-friendly:
- include “Load sample transcript” button
- include “Use demo doctor” quick actions
- include “Generate sample battlecard” action
- include “Start practice with seeded scenario” action
- include seeded results so the UI never feels empty

## README
Write a great README that includes:
- overview
- stack
- project structure
- setup
- environment variables
- prisma commands
- run instructions
- how to use the voice simulator
- how to seed demo data
- troubleshooting

## Environment variables
Include backend .env template with:
- OPENAI_API_KEY=
- DATABASE_URL="file:./dev.db"
- PORT=4000
- APP_ORIGIN=http://localhost:5173

## Development scripts
At root:
- install
- dev
- build
- start
- db:push
- db:seed

## Quality expectations
- TypeScript strict mode
- clean file structure
- modular code
- reusable components
- minimal tech debt
- no placeholder junk
- no half-finished files
- no TODO comments unless critical
- graceful loading/error states
- polished UX

## Nice-to-have extras if possible
- export practice report as printable page
- copy follow-up email button
- dark mode toggle (optional)
- keyboard shortcuts
- search doctors
- badge indicators for activity status

## Most important outcome
I want to open the app and immediately demo this flow:
1. Select doctor
2. Generate battlecard
3. Open objection simulator and start voice roleplay
4. End session and review practice report
5. Paste/upload transcript into post-call coach
6. Show next actions and follow-up output

Please generate the full codebase step by step and include all files needed.
If you need to make a tradeoff, optimize for:
- polished demo
- working flows
- clean architecture
- realistic data
- simple setup

Start by creating the project structure, package files, Prisma schema, seed data, and base frontend/backend setup.
Then implement each module fully.