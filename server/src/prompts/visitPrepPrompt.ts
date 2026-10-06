interface DoctorRow {
  fullName: string
  specialty: string
  personaType: string
  therapyArea: string
  likelyConcerns: string   // JSON string
  competitorPreference: string | null
  targetProduct: string
  notes: string | null
}

interface LastAnalysisRow {
  summary: string
  nextBestActions: string  // JSON string
}

interface ProductRow {
  productName: string
  indication: string
  differentiators: string  // JSON string
  keyBenefits: string      // JSON string
}

export function buildVisitPrepPrompt(
  doctor: DoctorRow,
  lastAnalysis: LastAnalysisRow | null,
  product: ProductRow | null,
): string {
  let concerns: string[] = []
  try { concerns = JSON.parse(doctor.likelyConcerns) } catch {}

  const lastVisitContext = lastAnalysis
    ? (() => {
        let nba: string[] = []
        try { nba = JSON.parse(lastAnalysis.nextBestActions) } catch {}
        return `LAST INTERACTION SUMMARY:\n${lastAnalysis.summary}\n\nACTIONS FROM LAST VISIT: ${nba.join('; ')}`
      })()
    : 'No prior interaction on record for this doctor.'

  const productContext = product
    ? (() => {
        let diff: string[] = []
        try { diff = JSON.parse(product.differentiators) } catch {}
        return `Product: ${product.productName} | Indication: ${product.indication} | Key differentiators: ${diff.slice(0, 3).join('; ')}`
      })()
    : `Target product: ${doctor.targetProduct}`

  return `You are a pharmaceutical sales coaching AI preparing a visit prep brief for a sales representative.

DOCTOR PROFILE:
Name: ${doctor.fullName}
Specialty: ${doctor.specialty}
Persona type: ${doctor.personaType}
Therapy area: ${doctor.therapyArea}
Likely concerns: ${concerns.join(', ')}
Competitor preference: ${doctor.competitorPreference ?? 'None specified'}
Rep notes: ${doctor.notes ?? 'None'}

${lastVisitContext}

${productContext}

Generate a concise, actionable visit preparation brief. Return ONLY valid JSON with exactly these fields:
{
  "lastVisitSummary": "2-3 sentence summary of the last interaction and what was agreed, OR 'First visit — no prior interaction recorded.' if no history",
  "whatTheyCareAbout": ["specific care point 1", "specific care point 2", "specific care point 3"],
  "likelyObjection": "The single most likely objection this specific doctor will raise — one clear, direct sentence",
  "keyStatToOpen": "One specific clinical data point or fact to lead with in the opening 2 minutes — be concrete",
  "doNotSay": "One specific thing to avoid saying to this doctor — phrased as a short instruction starting with 'Do not'",
  "openingLine": "A suggested natural, professional first sentence for the visit — first-person, 1-2 sentences"
}

Use the doctor's persona and known concerns to make every field specific and actionable. No placeholders.`
}
