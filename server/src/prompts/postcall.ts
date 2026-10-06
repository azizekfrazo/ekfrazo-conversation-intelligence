interface DoctorContext {
  fullName: string
  specialty: string
  personaType: string
  therapyArea: string
  likelyConcerns: string[]
}

interface ProductContext {
  productName: string
  indication: string
  approvedClaims: string[]
}

export function buildPostCallPrompt(
  transcript: string,
  doctor: DoctorContext,
  product: ProductContext,
): string {
  const claims = product.approvedClaims.join('; ')
  const concerns = doctor.likelyConcerns.join(', ')

  return `You are a senior pharmaceutical sales coach analyzing a post-call meeting transcript.

## Doctor Context
- Name: ${doctor.fullName}
- Specialty: ${doctor.specialty}
- Persona: ${doctor.personaType}
- Known Concerns: ${concerns}

## Product Discussed
- Product: ${product.productName}
- Indication: ${product.indication}
- Key Approved Claims: ${claims}

## Meeting Transcript
${transcript}

## Analysis Instructions
Analyze this meeting transcript comprehensively. Provide honest, constructive, actionable coaching output useful for:
1. The rep's self-improvement
2. A CRM activity log
3. A manager's coaching review

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-4 sentence factual summary of what happened in the meeting",
  "doctorConcerns": ["Specific concern raised by the doctor", "..."],
  "wentWell": ["Specific thing the rep did well, with evidence from the transcript", "..."],
  "couldImprove": ["Specific improvement area with concrete suggestion", "..."],
  "missedMoments": ["A moment in the conversation where a better response was possible", "..."],
  "doctorIntent": "One clear assessment of where this doctor is in the prescribing decision journey and what they need to move forward",
  "nextBestActions": ["Concrete next action for the rep to take within 48 hours", "..."],
  "followUpEmail": "A complete, ready-to-send professional follow-up email from the rep to the doctor. Include subject line. Reference specific discussion points from the meeting. Keep it concise and professional.",
  "crmNotes": "A structured CRM activity note in plain text format covering: doctor name, date, product discussed, call outcome, engagement level, key discussion points, next step, and potential assessment",
  "coachingSummary": "A manager-facing coaching summary covering: strengths observed, development area, compliance observation, and recommended next coaching action"
}

Keep all claims within approved messaging. Identify any potential compliance concerns if the rep made unapproved claims in the transcript.`
}
