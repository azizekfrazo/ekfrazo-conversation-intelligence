export interface FollowUpAction {
  id: string
  doctorId: string
  analysisId: string | null
  task: string
  status: 'pending' | 'done'
  createdAt: string
  completedAt: string | null
  doctor?: { id: string; fullName: string; specialty: string }
}

export interface VisitPrepContent {
  lastVisitSummary: string
  whatTheyCareAbout: string[]
  likelyObjection: string
  keyStatToOpen: string
  doNotSay: string
  openingLine: string
}

export interface VisitPrepSheet {
  id: string
  doctorId: string
  content: VisitPrepContent
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  territory: string | null
}

export type PersonaType =
  | 'EvidenceDriven'
  | 'Skeptical'
  | 'PriceSensitive'
  | 'BrandLoyal'
  | 'Busy'
  | 'FriendlyButReserved'

export type SeniorityLevel = 'Junior' | 'MidLevel' | 'Senior' | 'HoD'

export interface DoctorProfile {
  id: string
  fullName: string
  specialty: string
  city: string
  hospitalOrClinic: string | null
  personaType: PersonaType
  seniorityLevel: SeniorityLevel
  therapyArea: string
  targetProduct: string
  likelyConcerns: string[]
  competitorPreference: string | null
  lastInteractionDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  userId: string
  _count?: {
    battlecards: number
    practiceSessions: number
    postCallAnalyses: number
  }
}

export interface Product {
  id: string
  productName: string
  therapyArea: string
  indication: string
  keyBenefits: string[]
  sideEffects: string[]
  differentiators: string[]
  competitorNames: string[]
  approvedClaims: string[]
  disclaimers: string
  createdAt: string
  updatedAt: string
}

export interface BattlecardContent {
  oneLiner: string
  likelyQuestions: Array<{ question: string; suggestedResponse: string }>
  talkingPoints: string[]
  objectionsToAnticipate: Array<{ objection: string; response: string }>
  whatNotToSay: string[]
  confidenceChecklist: string[]
}

export interface Battlecard {
  id: string
  content: BattlecardContent
  repNotes: string | null
  createdAt: string
  updatedAt: string
  doctorId: string
  productId: string
  userId: string
  product?: Product
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type ObjectionType =
  | 'Efficacy'
  | 'Safety'
  | 'SideEffects'
  | 'Cost'
  | 'CompetitorComparison'
  | 'PatientAdherence'

export interface PracticeTurn {
  id: string
  role: 'rep' | 'doctor'
  content: string
  timestamp: string
  sessionId: string
}

export interface PracticeReport {
  id: string
  summary: string
  strengths: string[]
  weakMoments: string[]
  missedOpportunities: string[]
  objectionHandlingScore: number
  clarityScore: number
  confidenceScore: number
  complianceScore: number
  overallScore?: number
  improvements: string[]
  nextPractice: string[]
  createdAt: string
  sessionId: string
}

export interface PracticeSession {
  id: string
  difficulty: Difficulty
  objectionFocus: ObjectionType
  status: 'active' | 'completed'
  durationSeconds: number
  createdAt: string
  updatedAt: string
  doctorId: string
  userId: string
  turns?: PracticeTurn[]
  report?: PracticeReport | null
  doctor?: DoctorProfile
  _count?: { turns: number }
}

export interface MeetingTranscript {
  id: string
  title: string
  content: string
  isDemo: boolean
  createdAt: string
  doctorId: string
}

export interface PostCallAnalysis {
  id: string
  summary: string
  doctorConcerns: string[]
  wentWell: string[]
  couldImprove: string[]
  missedMoments: string[]
  doctorIntent: string
  nextBestActions: string[]
  followUpEmail: string
  crmNotes: string
  coachingSummary: string
  createdAt: string
  doctorId: string
  userId: string
  transcriptId: string | null
  transcript?: MeetingTranscript | null
  doctor?: DoctorProfile
}

export interface Note {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  doctorId: string
  userId: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: string | null
  createdAt: string
  threadId: string
}

export interface TimelineEvent {
  id: string
  type:
    | 'doctor_created'
    | 'battlecard_generated'
    | 'practice_session'
    | 'postcall_analysis'
    | 'note_added'
  label: string
  timestamp: string
  data: Record<string, unknown>
}
