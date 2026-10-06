interface Turn {
  role: string
  content: string
}

export function buildPracticeReportPrompt(
  turns: Turn[],
  doctorName: string,
  doctorPersona: string,
  productName: string,
  difficulty: string,
  objectionFocus: string,
): string {
  const transcript = turns
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join('\n')

  return `You are a senior pharmaceutical sales coach analyzing a practice session transcript.

## Session Context
- Doctor Simulated: ${doctorName} (Persona: ${doctorPersona})
- Product: ${productName}
- Difficulty: ${difficulty}
- Objection Focus: ${objectionFocus}

## Transcript
${transcript}

## Analysis Instructions
Analyze the rep's performance fairly and constructively. Look for:
- Accuracy of clinical claims and data cited
- Quality of objection handling
- Communication clarity and confidence
- Compliance with approved messaging
- Missed opportunities
- What worked well

Produce a comprehensive coaching report. Return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence overall assessment of the session",
  "strengths": ["Specific strength observed with evidence from transcript", "..."],
  "weakMoments": ["Specific weak moment with explanation of why it was suboptimal", "..."],
  "missedOpportunities": ["Moment in the conversation where a stronger response was possible", "..."],
  "objectionHandlingScore": 75,
  "clarityScore": 80,
  "confidenceScore": 72,
  "complianceScore": 85,
  "improvements": ["Concrete, actionable improvement suggestion", "..."],
  "nextPractice": ["Specific practice scenario or focus to work on next", "..."]
}

Score guidelines (all scores 0-100):
- objectionHandlingScore: How well did the rep handle the objections raised?
- clarityScore: Was the messaging clear, concise, and easy to follow?
- confidenceScore: Did the rep sound confident and composed under pressure?
- complianceScore: Were all claims accurate and within approved messaging?

Provide 3-5 items for each array. Keep all feedback constructive and coaching-oriented.`
}
