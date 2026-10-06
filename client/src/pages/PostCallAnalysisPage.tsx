import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Target,
  Mail,
  Database,
  Users,
  Printer,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { PostCallAnalysis } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { PageLoader } from '../components/shared/LoadingSpinner'
import { formatDate } from '../lib/utils'

export default function PostCallAnalysisPage() {
  const { id: doctorId, analysisId } = useParams<{ id: string; analysisId: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['postcall-analysis', analysisId],
    queryFn: () =>
      api
        .get<{ analysis: PostCallAnalysis }>(`/api/postcall/analysis/${analysisId}`)
        .then((r) => r.data),
    enabled: !!analysisId,
  })

  const analysis = data?.analysis

  if (isLoading) return <PageLoader />
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">Analysis not found.</p>
        <Button onClick={() => navigate(`/doctors/${doctorId}?tab=postcall`)}>Go back</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-lavender-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(`/doctors/${doctorId}?tab=postcall`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Post-Call
          </button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="page-title">Post-Call Analysis</h1>
          <p className="text-sm text-gray-500 mt-1">
            {analysis.transcript?.title ?? 'Meeting Transcript'} · {formatDate(analysis.createdAt)}
          </p>
        </div>

        {/* Summary */}
        <Card className="bg-brand-800 text-white border-0">
          <CardContent className="p-6">
            <div className="text-brand-200 text-xs font-semibold uppercase tracking-wider mb-2">
              Meeting Summary
            </div>
            <p className="text-sm leading-relaxed">{analysis.summary}</p>
          </CardContent>
        </Card>

        {/* 2-col grid: went well + improve */}
        <div className="grid sm:grid-cols-2 gap-4">
          <FeedbackSection
            title="What Went Well"
            items={analysis.wentWell}
            icon={CheckCircle2}
            color="text-green-600"
            bg="bg-green-50"
            border="border-green-200"
          />
          <FeedbackSection
            title="Could Improve"
            items={analysis.couldImprove}
            icon={AlertTriangle}
            color="text-amber-600"
            bg="bg-amber-50"
            border="border-amber-200"
          />
        </div>

        {/* Doctor concerns + missed moments */}
        <div className="grid sm:grid-cols-2 gap-4">
          <FeedbackSection
            title="Doctor Concerns Raised"
            items={analysis.doctorConcerns}
            icon={Users}
            color="text-blue-600"
            bg="bg-blue-50"
            border="border-blue-200"
          />
          <FeedbackSection
            title="Missed Moments"
            items={analysis.missedMoments}
            icon={Lightbulb}
            color="text-purple-600"
            bg="bg-purple-50"
            border="border-purple-200"
          />
        </div>

        {/* Doctor intent */}
        <Card>
          <CardContent className="p-5 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-lavender-100 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-brand-800" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1.5">Doctor Intent Assessment</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{analysis.doctorIntent}</p>
            </div>
          </CardContent>
        </Card>

        {/* Next best actions */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Next Best Actions</h3>
            <div className="space-y-2">
              {analysis.nextBestActions.map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-lavender-50 border border-lavender-200">
                  <div className="h-5 w-5 rounded-full bg-brand-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-700">{action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Follow-up email */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Follow-Up Email Draft</h3>
              </div>
              <CopyButton text={analysis.followUpEmail} />
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
              {analysis.followUpEmail}
            </pre>
          </CardContent>
        </Card>

        {/* CRM Notes */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">CRM Activity Note</h3>
              </div>
              <CopyButton text={analysis.crmNotes} />
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
              {analysis.crmNotes}
            </pre>
          </CardContent>
        </Card>

        {/* Manager coaching summary */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Manager Coaching Summary</h3>
              </div>
              <CopyButton text={analysis.coachingSummary} />
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
              {analysis.coachingSummary}
            </pre>
          </CardContent>
        </Card>

        {/* Original transcript */}
        {analysis.transcript && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Original Transcript</h3>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-72 overflow-y-auto scrollbar-thin">
                {analysis.transcript.content}
              </pre>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}

function FeedbackSection({
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
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
