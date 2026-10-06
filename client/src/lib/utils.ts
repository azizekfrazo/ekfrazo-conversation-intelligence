import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PersonaType } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return formatDate(date)
}

export const personaLabels: Record<PersonaType, string> = {
  EvidenceDriven: 'Evidence-Driven',
  Skeptical: 'Skeptical',
  PriceSensitive: 'Price-Sensitive',
  BrandLoyal: 'Brand-Loyal',
  Busy: 'High-Prescriber',
  FriendlyButReserved: 'Friendly',
}

// Dark-theme persona badge colors
export const personaColors: Record<PersonaType, string> = {
  EvidenceDriven:     'bg-[#0D2137] text-[#58A6FF] border-[#1F4C73]',
  BrandLoyal:         'bg-[#1F1635] text-[#BC8CFF] border-[#3D2680]',
  Busy:               'bg-[#12201A] text-[#3FB950] border-[#1F5231]',
  Skeptical:          'bg-[#261900] text-[#D29922] border-[#4D3200]',
  PriceSensitive:     'bg-[#1F0D0D] text-[#F85149] border-[#5C1C1A]',
  FriendlyButReserved:'bg-[#001D2E] text-[#00B4D8] border-[#003D5C]',
}

// Dark-theme difficulty colors
export const difficultyColors = {
  Easy:   'bg-[#12201A] text-[#3FB950] border-[#1F5231]',
  Medium: 'bg-[#261900] text-[#D29922] border-[#4D3200]',
  Hard:   'bg-[#1F0D0D] text-[#F85149] border-[#5C1C1A]',
}

export const objectionLabels: Record<string, string> = {
  Efficacy: 'Efficacy',
  Safety: 'Safety',
  SideEffects: 'Side Effects',
  Cost: 'Cost',
  CompetitorComparison: 'Competitor',
  PatientAdherence: 'Adherence',
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-[#3FB950]'
  if (score >= 60) return 'text-[#D29922]'
  return 'text-[#F85149]'
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-[#3FB950]'
  if (score >= 60) return 'bg-[#D29922]'
  return 'bg-[#F85149]'
}

// Unique Unsplash photos keyed by doctor name — guarantees distinct faces
const DOCTOR_PHOTOS_BY_NAME: Record<string, string> = {
  'Dr. Priya Mehta':   'photo-1559839734-2b71ea197ec2',
  'Dr. Rajesh Kumar':  'photo-1612349317150-e413f6a5b16d',
  'Dr. Ananya Singh':  'photo-1594824476967-48c8b964273f',
  'Dr. Vikram Nair':   'photo-1622253692010-333f2da6031d',
  'Dr. Sunita Rao':    'photo-1614608682850-e0d6ed316d47',
  'Dr. Arjun Patel':   'photo-1537368910025-700350fe46c7',
  'Dr. Kavitha Iyer':  'photo-1651008376811-b90baee60c1f',
  'Dr. Suresh Menon':  'photo-1582750433449-648ed127bb54',
}

// Expanded pool for seed-based fallback (8 distinct faces)
const doctorPhotoIds = [
  'photo-1559839734-2b71ea197ec2',
  'photo-1612349317150-e413f6a5b16d',
  'photo-1594824476967-48c8b964273f',
  'photo-1622253692010-333f2da6031d',
  'photo-1614608682850-e0d6ed316d47',
  'photo-1537368910025-700350fe46c7',
  'photo-1651008376811-b90baee60c1f',
  'photo-1582750433449-648ed127bb54',
]

// Returns photo URL by doctor name (for seeded/DB doctors) or by string hash (fallback)
export function doctorPhotoUrl(seed: string, w = 120, h = 120): string {
  // Check by name
  const byName = DOCTOR_PHOTOS_BY_NAME[seed]
  if (byName) return `https://images.unsplash.com/${byName}?w=${w}&h=${h}&auto=format&fit=crop&q=70`
  // Sum-of-chars hash across the full seed for better distribution
  const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const idx = hash % doctorPhotoIds.length
  return `https://images.unsplash.com/${doctorPhotoIds[idx]}?w=${w}&h=${h}&auto=format&fit=crop&face&q=70`
}

// Direct name-based lookup (for hardcoded demo doctors)
export function doctorPhotoByName(name: string, w = 120, h = 120): string {
  return doctorPhotoUrl(name, w, h)
}
