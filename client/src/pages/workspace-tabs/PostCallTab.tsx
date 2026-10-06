import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Upload, ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { DoctorProfile, PostCallAnalysis, Product, MeetingTranscript } from '../../types'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { EmptyState } from '../../components/shared/EmptyState'
import { formatRelative } from '../../lib/utils'

interface Props { doctor: DoctorProfile }

const DEMO_TRANSCRIPTS: Record<string, string> = {
  cardiology: `REP: Good morning, Dr. Krishnamurti. Thank you for taking the time today.
DR: Yes, I have about 15 minutes. What's this about?
REP: I wanted to discuss Cardovix 10mg for your paroxysmal AFib patients.
DR: I'm familiar with several agents in this space. What differentiates Cardovix from Amiodarex?
REP: Cardovix offers a cleaner drug interaction profile and once-daily dosing. The AFFIRM-3 trial shows 2.1% vs 8.4% thyroid adverse events over 7 years.
DR: But Amiodarex has 20 years of real-world evidence. Why would I change?
REP: For patients already stable on Amiodarex, no reason to switch. But for new patients starting long-term therapy, the cumulative toxicity risk matters significantly.
DR: Fair point. What about elderly patients with renal issues?
REP: No dose adjustment until CrCl drops below 30 mL/min. And monitoring is simpler — baseline ECG, 6-month ECG, annual LFTs only. No TFTs or PFTs needed.
DR: That monitoring reduction is genuinely useful in a busy practice. Send me the AFFIRM-3 data.`,
  diabetes: `REP: Good afternoon, Dr. Mehta. I'm here about Glytara for your T2D patients with cardiovascular risk.
DR: GLP-1s are expensive. My patients struggle with cost.
REP: We have a patient access program. For income below 6 lakh/year, the monthly cost can be around ₹800. Our coordinator handles the enrollment paperwork.
DR: What about adherence? Injectables are always problematic.
REP: Glytara is weekly, not daily. SUSTAIN-4 showed 89% adherence at 52 weeks versus 67% for daily injectables.
DR: 89%? That's higher than I'd expect. What about nausea?
REP: Structured escalation starting at 0.5mg. Discontinuation due to GI AEs was only 3.8% in Phase 3.
DR: And cardiovascular data?
REP: SUSTAIN-CARDIO: 26% reduction in MACE in T2D patients with established CVD.
DR: Can you leave samples? And have the coordinator call my office.`,
}

export function PostCallTab({ doctor }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [transcriptText, setTranscriptText] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(doctor.targetProduct)
  const [transcriptTitle, setTranscriptTitle] = useState('')

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/products').then((r) => r.data),
  })

  const { data: analysesData, isLoading } = useQuery({
    queryKey: ['postcall-analyses', doctor.id],
    queryFn: () =>
      api
        .get<{ analyses: PostCallAnalysis[] }>(`/api/postcall/${doctor.id}/postcall-analyses`)
        .then((r) => r.data),
  })

  const { data: transcriptsData } = useQuery({
    queryKey: ['transcripts', doctor.id],
    queryFn: () =>
      api
        .get<{ transcripts: MeetingTranscript[] }>(`/api/postcall/transcripts/${doctor.id}`)
        .then((r) => r.data),
  })

  const analyzeMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ analysis: PostCallAnalysis }>('/api/postcall/analyze', {
          doctorId: doctor.id,
          productId: selectedProductId,
          userId: user!.id,
          transcriptText,
          transcriptTitle: transcriptTitle || undefined,
        })
        .then((r) => r.data.analysis),
    onSuccess: (analysis) => {
      qc.invalidateQueries({ queryKey: ['postcall-analyses', doctor.id] })
      qc.invalidateQueries({ queryKey: ['timeline', doctor.id] })
      navigate(`/doctors/${doctor.id}/postcall/${analysis.id}`)
    },
  })

  const analyses = analysesData?.analyses ?? []
  const products = productsData?.products ?? []
  const demoTranscripts = transcriptsData?.transcripts?.filter((t) => t.isDemo) ?? []

  const loadDemoTranscript = (transcript: MeetingTranscript) => {
    setTranscriptText(transcript.content)
    setTranscriptTitle(transcript.title)
  }

  return (
    <div className="space-y-5">
      {/* Upload panel */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Analyze Meeting Transcript</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Paste your post-call transcript or load a demo sample
            </p>
          </div>

          {demoTranscripts.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">Load demo transcript:</div>
              <div className="flex flex-wrap gap-2">
                {demoTranscripts.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadDemoTranscript(t)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-brand-200 text-brand-800 bg-lavender-50 hover:bg-lavender-100 transition-colors"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Product</label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Transcript</label>
            <Textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Paste your meeting transcript here… REP: … DR: …"
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          {analyzeMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {analyzeMutation.error.message}
            </div>
          )}

          <Button
            onClick={() => analyzeMutation.mutate()}
            loading={analyzeMutation.isPending}
            disabled={transcriptText.trim().length < 50 || !selectedProductId}
          >
            <FileText className="h-4 w-4" />
            {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze Transcript'}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Analysis History</h3>
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : analyses.length === 0 ? (
          <EmptyState
            icon={Upload}
            title="No analyses yet"
            description="Upload a meeting transcript to generate your first post-call analysis."
          />
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <AnalysisCard
                key={a.id}
                analysis={a}
                doctorId={doctor.id}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function AnalysisCard({ analysis, doctorId }: { analysis: PostCallAnalysis; doctorId: string }) {
  const navigate = useNavigate()
  return (
    <Card
      className="hover:shadow-card-hover transition-shadow cursor-pointer"
      onClick={() => navigate(`/doctors/${doctorId}/postcall/${analysis.id}`)}
    >
      <CardContent className="p-4 flex items-start gap-4">
        <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {analysis.transcript?.title ?? 'Meeting Analysis'}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{analysis.summary}</p>
          <div className="text-xs text-gray-400 mt-1">{formatRelative(analysis.createdAt)}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
      </CardContent>
    </Card>
  )
}
