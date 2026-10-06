interface DoctorContext {
  fullName: string
  specialty: string
  personaType: string
  seniorityLevel: string
  therapyArea: string
  likelyConcerns: string[]
  competitorPreference: string | null
  notes: string | null
}

interface ProductContext {
  productName: string
  therapyArea: string
  indication: string
  keyBenefits: string[]
  sideEffects: string[]
  differentiators: string[]
  competitorNames: string[]
  approvedClaims: string[]
  disclaimers: string
}

export function buildBattlecardPrompt(
  doctor: DoctorContext,
  product: ProductContext,
  repNotes?: string,
): string {
  const concerns = doctor.likelyConcerns.join(', ')
  const benefits = product.keyBenefits.join('\n- ')
  const differentiators = product.differentiators.join('\n- ')
  const claims = product.approvedClaims.join('\n- ')
  const competitors = product.competitorNames.join(', ')

  return `You are a senior pharmaceutical sales coach. Generate a structured Pre-Call Battlecard for a sales representative preparing to meet a doctor.

## Doctor Profile
- Name: ${doctor.fullName}
- Specialty: ${doctor.specialty}
- Persona: ${doctor.personaType}
- Seniority: ${doctor.seniorityLevel}
- Therapy Area: ${doctor.therapyArea}
- Likely Concerns: ${concerns}
- Current/Preferred Competitor: ${doctor.competitorPreference ?? 'Not specified'}
- Additional Context: ${doctor.notes ?? 'None'}

## Product Being Discussed
- Product: ${product.productName}
- Indication: ${product.indication}
- Key Benefits:
- ${benefits}
- Key Differentiators:
- ${differentiators}
- Approved Clinical Claims:
- ${claims}
- Competitor Products: ${competitors}

## Rep's Notes for This Visit
${repNotes ?? 'None provided.'}

## Instructions
Generate a comprehensive pre-call battlecard as a JSON object. The battlecard should:
1. Be practical, concise, and tailored to this specific doctor's persona and concerns
2. Use ONLY approved clinical claims — no exaggerated or unapproved marketing language
3. Focus on what a rep can realistically say in a 15-minute doctor meeting
4. Include realistic objections this specific doctor persona would raise
5. Keep the "what not to say" section tactful and compliance-focused

Return ONLY a valid JSON object with this exact structure:
{
  "oneLiner": "A single punchy value proposition sentence for this doctor-product pairing",
  "likelyQuestions": [
    {
      "question": "Question the doctor is likely to ask",
      "suggestedResponse": "Concise, accurate, approved response"
    }
  ],
  "talkingPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "objectionsToAnticipate": [
    {
      "objection": "Specific objection this doctor persona would raise",
      "response": "How to handle it professionally"
    }
  ],
  "whatNotToSay": ["Compliance guidance point 1", "Compliance guidance point 2"],
  "confidenceChecklist": ["Pre-meeting prep item 1", "Pre-meeting prep item 2"]
}

Produce 4-5 likelyQuestions, 5-6 talkingPoints, 3-4 objectionsToAnticipate, 3-4 whatNotToSay items, and 5-6 confidenceChecklist items.`
}
