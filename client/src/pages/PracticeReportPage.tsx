import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  Printer,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { api } from '../lib/api'
import { PracticeSession, PracticeReport } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { PageLoader } from '../components/shared/LoadingSpinner'
import { difficultyColors, objectionLabels, scoreColor, scoreBg, formatTime } from '../lib/utils'

export default function PracticeReportPage() {
  const { id: doctorId, sessionId } = useParams<{ id: string; sessionId: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['practice-session', sessionId],
    queryFn: () =>
      api
        .get<{ session: PracticeSession }>(`/api/practice/session/${sessionId}`)
        .then((r) => r.data),
    enabled: !!sessionId,
  })

  const generateReportMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ report: PracticeReport }>(`/api/practice/session/${sessionId}/report`)
        .then((r) => r.data.report),
    onSuccess: () => {
      window.location.reload()
    },
  })

  const session = data?.session
  const report = session?.report

  if (isLoading) return <PageLoader />
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">Session not found.</p>
        <Button onClick={() => navigate(`/doctors/${doctorId}?tab=practice`)}>Go back</Button>
      </div>
    )
  }

  const avgScore = report
    ? Math.round(
        (report.objectionHandlingScore + report.clarityScore + report.confidenceScore + report.complianceScore) / 4,
      )
    : 0

  return (
    <div className="min-h-screen bg-lavender-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(`/doctors/${doctorId}?tab=practice`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Practice
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Report
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="page-title">Practice Session Report</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${difficultyColors[session.difficulty]}`}>
              {session.difficulty}
            </span>
            <Badge variant="default">{objectionLabels[session.objectionFocus]}</Badge>
            <span className="text-xs text-gray-400">Duration: {formatTime(session.durationSeconds)}</span>
            {session.doctor && (
              <span className="text-xs text-gray-400">
                with Dr. {session.doctor.fullName}
              </span>
            )}
          </div>
        </div>

        {!report ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-lavender-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-brand-800" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Generate Performance Report</h3>
                <p className="text-sm text-gray-500 mt-1">
                  AI will analyze your session transcript and provide detailed coaching feedback.
                </p>
              </div>
              {generateReportMutation.isError && (
                <p className="text-sm text-red-600">{generateReportMutation.error.message}</p>
              )}
              <Button
                onClick={() => generateReportMutation.mutate()}
                loading={generateReportMutation.isPending}
              >
                {generateReportMutation.isPending ? 'Analyzing…' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score overview */}
            <Card className="bg-brand-800 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-brand-200 text-xs font-semibold uppercase tracking-wider mb-1">
                      Overall Performance
                    </div>
                    <div className="text-5xl font-bold">{avgScore}</div>
                    <div className="text-brand-200 text-sm">/100</div>
                  </div>
                  <div className="text-right">
                    <ScoreRing score={avgScore} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Objection Handling', score: report.objectionHandlingScore },
                    { label: 'Clarity', score: report.clarityScore },
                    { label: 'Confidence', score: report.confidenceScore },
                    { label: 'Compliance', score: report.complianceScore },
                  ].map(({ label, score }) => (
                    <div key={label} className="bg-white/10 rounded-xl p-3">
                      <div className="text-2xl font-bold">{score}</div>
                      <div className="text-brand-200 text-xs mt-0.5">{label}</div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white transition-all"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Session Summary</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
              </CardContent>
            </Card>

            {/* Strengths / Weak moments / Missed */}
            <div className="grid sm:grid-cols-3 gap-4">
              <FeedbackCard
                title="Strengths"
                items={report.strengths}
                icon={CheckCircle2}
                color="text-green-600"
                bg="bg-green-50"
                border="border-green-200"
              />
              <FeedbackCard
                title="Areas to Improve"
                items={report.weakMoments}
                icon={AlertTriangle}
                color="text-amber-600"
                bg="bg-amber-50"
                border="border-amber-200"
              />
              <FeedbackCard
                title="Missed Opportunities"
                items={report.missedOpportunities}
                icon={Lightbulb}
                color="text-blue-600"
                bg="bg-blue-50"
                border="border-blue-200"
              />
            </div>

            {/* Improvements */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Recommended Improvements</h3>
                <div className="space-y-3">
                  {report.improvements.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next practice */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Next Practice Suggestions</h3>
                <div className="space-y-2">
                  {report.nextPractice.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-lavender-50 border border-lavender-200">
                      <ChevronRight className="h-4 w-4 text-brand-800 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Transcript */}
            {session.turns && session.turns.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Session Transcript</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-2">
                    {session.turns.map((turn) => (
                      <div key={turn.id} className={`flex ${turn.role === 'rep' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                          turn.role === 'rep'
                            ? 'bg-brand-800 text-white rounded-tr-sm'
                            : 'bg-lavender-100 text-gray-800 rounded-tl-sm'
                        }`}>
                          <div className="font-semibold text-xs mb-1 opacity-70">
                            {turn.role === 'rep' ? 'You' : session.doctor?.fullName ?? 'Doctor'}
                          </div>
                          {turn.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-4 pt-2 no-print">
              <Button
                variant="outline"
                onClick={() => navigate(`/doctors/${doctorId}/simulator?difficulty=${session.difficulty}&objectionFocus=${session.objectionFocus}`)}
              >
                Practice Again
              </Button>
              <Button onClick={() => navigate(`/doctors/${doctorId}?tab=practice`)}>
                Back to Workspace
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

function FeedbackCard({
  title,
  items,
  icon: Icon,
  color,
  bg,
  border,
}: {
  title: string
  items: string[]
  icon: typeof CheckCircle2
  color: string
  bg: string
  border: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 mb-3`}>
          <div className={`h-7 w-7 rounded-lg ${bg} border ${border} flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-gray-600 leading-relaxed pl-2 border-l-2 border-gray-100">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
    </svg>
  )
}
