export type Mood = 'Warm' | 'Sceptical' | 'Neutral' | 'Urgent'

export interface Tier1Card {
  say: string
  mood: Mood
  next: string
  alert: string | null
}

export interface Tier1Entry {
  id: string
  patterns: string[] // each pattern must be word-boundary-padded (leading and trailing space)
  card: Tier1Card
}

// ── Tier 1 Entries — first-match-wins, order matters ──────────────────────────
// call_positive_close is FIRST so overlapping patterns don't falsely trigger
// objection entries when the doctor is actually signalling interest.

export const TIER1: Tier1Entry[] = [
  {
    id: 'call_positive_close',
    patterns: [
      ' i will try it ',
      ' send me the samples ',
      ' looks interesting ',
      ' i will consider ',
      ' good to know ',
      ' thank you for the information ',
      ' leave me samples ',
      ' sounds interesting ',
      ' i am interested ',
    ],
    card: {
      say: "Excellent — I'll arrange the sample pack and clinical data sheet right away. May I confirm your clinic address and the best contact for our patient support team?",
      mood: 'Warm',
      next: "Log as 'Interested — samples requested'. Schedule follow-up in 2 weeks. Send clinical summary PDF and PSP enrolment form today.",
      alert: null,
    },
  },
  {
    id: 'clinical_data_request',
    patterns: [
      ' clinical trial ',
      ' efficacy data ',
      ' side effects ',
      ' adverse events ',
      ' what does the data show ',
      ' peer reviewed ',
      ' published study ',
      ' what is the evidence ',
      ' mechanism of action ',
      ' compared to ',
      ' what does research say ',
      ' is there data ',
      ' show me the data ',
      ' any studies ',
    ],
    card: {
      say: "The Phase III STRIDE-India trial, published in NEJM, showed a 34% reduction in the primary endpoint versus standard of care in South Asian patients. I can send you the full peer-reviewed paper today.",
      mood: 'Sceptical',
      next: "Offer to email the peer-reviewed publication. Ask: 'Do you have patients currently on the comparator drug?' to open the switch conversation.",
      alert: null,
    },
  },
  {
    id: 'pricing_objection',
    patterns: [
      ' too expensive ',
      ' cost ',
      ' cheaper alternative ',
      ' generic available ',
      ' what is the price ',
      ' insurance cover ',
      ' reimbursement ',
      ' afford ',
      ' out of pocket ',
      ' how much does it cost ',
      ' patient cannot afford ',
    ],
    card: {
      say: "I completely understand — affordability is a genuine barrier. We have a patient support programme where eligible patients access the medication at significantly reduced out-of-pocket cost. Let me walk you through the enrolment process.",
      mood: 'Sceptical',
      next: "If public hospital: confirm CGHS / government empanelment. If private: offer institutional pricing proposal. Flag for MSL follow-up if formulary committee is involved.",
      alert: "⚠ Formulary committee approval may be needed — flag for MSL follow-up if this is a hospital setting.",
    },
  },
  {
    id: 'competitor_mention',
    patterns: [
      ' already prescribing ',
      ' happy with current ',
      ' why switch ',
      ' difference between ',
      ' been using ',
      ' currently on ',
      ' my patients are on ',
      ' prefer another ',
    ],
    card: {
      say: "Both are clinically effective options. The key differentiation is once-daily versus twice-daily dosing and a more favourable tolerability profile at 52 weeks in our head-to-head data — which translates directly to patient adherence.",
      mood: 'Sceptical',
      next: "Do NOT disparage the competitor. Focus on differentiation: dosing convenience, tolerability, and adherence outcomes. Offer comparative data sheet.",
      alert: null,
    },
  },
]

// ── scenarioKey mapping ────────────────────────────────────────────────────────
// Returns a key for the inline guidance strip. null = no strip rendered.
export function scenarioKeyFromTier1Id(id: string): string | null {
  if (id === 'pricing_objection') return 'pricing'
  if (id === 'competitor_mention') return 'competitor'
  return null
}

// ── Scenario guidance strips ──────────────────────────────────────────────────
export interface ScenarioGuidance {
  intent: string
  dataPoints: string[]
  howToHandle: string
}

export const SCENARIO_GUIDANCE: Record<string, ScenarioGuidance> = {
  pricing: {
    intent: 'Pricing / Access Objection',
    dataPoints: [
      'Patient Support Programme: up to 70% subsidy; 4,200+ patients enrolled in Maharashtra',
      'CGHS empanelled since Jan 2024; SBI Health, HDFC, Star Health covered',
      'Median monthly out-of-pocket after PSP: ~₹800 for eligible patients',
    ],
    howToHandle: "Acknowledge the constraint first, then pivot to specific programme numbers — never leave the doctor guessing what 'affordable' actually means.",
  },
  competitor: {
    intent: 'Competitor / Switching Resistance',
    dataPoints: [
      'Once-daily vs twice-daily dosing: 89% adherence at 52 weeks vs 67% for daily comparator',
      'Grade 3+ tolerability AEs: 9% vs 14% for Gefitex in cross-trial comparison',
      'CNS penetration (where applicable): intracranial ORR 65% vs 26% erlotinib',
    ],
    howToHandle: "Agree that the current drug works, then introduce the patient adherence and tolerability data as the reason some doctors add this option for specific patient types.",
  },
}
