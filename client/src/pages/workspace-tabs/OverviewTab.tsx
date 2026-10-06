import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Mic, Phone, MapPin, Building2, Calendar, Target,
  ClipboardList, Loader2, RefreshCw, Printer, X, Copy, Check, ChevronDown,
} from 'lucide-react'
import { DoctorProfile, VisitPrepContent, VisitPrepSheet } from '../../types'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { formatDate, personaLabels, personaColors } from '../../lib/utils'
import { api } from '../../lib/api'

interface Props {
  doctor: DoctorProfile
  onTabChange: (tab: string) => void
}

export function OverviewTab({ doctor, onTabChange }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPrep, setShowPrep] = useState(false)
  const [activePrepContent, setActivePrepContent] = useState<VisitPrepContent | null>(null)
  const [copiedOpener, setCopiedOpener] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { data: historyData } = useQuery({
    queryKey: ['visit-prep-history', doctor.id],
    queryFn: () => api.get(`/api/doctors/${doctor.id}/visit-prep`).then((r) => r.data),
    enabled: showPrep,
    retry: false,
  })
  const sheets: VisitPrepSheet[] = historyData?.sheets ?? []

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/doctors/${doctor.id}/visit-prep/generate`).then((r) => r.data),
    onSuccess: (data) => {
      setActivePrepContent(data.sheet.content)
      queryClient.invalidateQueries({ queryKey: ['visit-prep-history', doctor.id] })
    },
  })

  const handleOpenPrep = useCallback(() => {
    setShowPrep(true)
    if (!activePrepContent) {
      generateMutation.mutate()
    }
  }, [activePrepContent, generateMutation])

  const handleRegenerate = () => {
    setActivePrepContent(null)
    generateMutation.mutate()
  }

  const handlePrint = () => {
    if (!activePrepContent) return
    const win = window.open('', '_blank')
    if (!win) return
    const c = activePrepContent
    const concerns = (c.whatTheyCareAbout ?? []).map((x) => `<span class="chip">${x}</span>`).join('')
    win.document.write(`<!DOCTYPE html><html><head>
<title>Visit Prep — ${doctor.fullName}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:2rem;max-width:720px;margin:0 auto;color:#1a1a1a}
  h1{font-size:1.4rem;margin-bottom:.25rem}
  .sub{color:#666;font-size:.875rem;margin-bottom:2rem}
  h2{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:1.5rem 0 .4rem}
  p{margin:.4rem 0;line-height:1.6}
  .chip{display:inline-block;padding:.2rem .6rem;border-radius:9999px;background:#f0f0f0;margin:.2rem;font-size:.8rem}
  .amber{background:#fef3c7;color:#92400e;padding:.6rem 1rem;border-radius:.5rem;border-left:3px solid #F59E0B}
  .teal{background:#d1fae5;color:#065f46;padding:.6rem 1rem;border-radius:.5rem;border-left:3px solid #10B981}
  .red{color:#dc2626;font-weight:600}
  blockquote{font-style:italic;font-size:1rem;border-left:3px solid #4B2A91;padding:.5rem 1rem;margin:0;color:#333}
  @media print{body{padding:1rem}}
</style></head><body>
<h1>Visit Prep Brief — ${doctor.fullName}</h1>
<div class="sub">${doctor.specialty} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
<h2>Last Visit</h2><p>${c.lastVisitSummary}</p>
<h2>What This Doctor Cares About</h2><p>${concerns}</p>
<h2>Expect This Objection</h2><p class="amber">${c.likelyObjection}</p>
<h2>Lead With This Stat</h2><p class="teal">${c.keyStatToOpen}</p>
<h2>Do Not Say</h2><p class="red">${c.doNotSay}</p>
<h2>Suggested Opening Line</h2><blockquote>"${c.openingLine}"</blockquote>
<p style="margin-top:3rem;font-size:.75rem;color:#999">For coaching and preparation purposes only. Final field messaging should follow approved medical, legal, and regulatory guidance.</p>
</body></html>`)
    win.document.close()
    win.print()
  }

  const copyOpener = () => {
    if (!activePrepContent) return
    navigator.clipboard.writeText(activePrepContent.openingLine).then(() => {
      setCopiedOpener(true)
      setTimeout(() => setCopiedOpener(false), 2000)
    })
  }

  const actions = [
    {
      icon: FileText,
      title: 'Generate Battlecard',
      desc: 'AI-powered call prep',
      color: '#58A6FF',
      bg: '#0D2137',
      onClick: () => onTabChange('battlecards'),
    },
    {
      icon: Mic,
      title: 'Voice Practice',
      desc: 'Roleplay objections',
      color: '#BC8CFF',
      bg: '#1F1635',
      onClick: () => navigate(`/doctors/${doctor.id}/simulator`),
    },
    {
      icon: Phone,
      title: 'Post-Call Analysis',
      desc: 'Analyze a transcript',
      color: '#3FB950',
      bg: '#12201A',
      onClick: () => onTabChange('postcall'),
    },
    {
      icon: ClipboardList,
      title: 'Visit Prep Sheet',
      desc: 'AI brief for next visit',
      color: '#F0A500',
      bg: '#261900',
      onClick: handleOpenPrep,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Doctor info card */}
      <div
        className="rounded-[10px] border p-5 space-y-4"
        style={{ background: '#161B22', borderColor: '#30363D' }}
      >
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={MapPin} label="City" value={doctor.city} />
          {doctor.hospitalOrClinic && (
            <InfoRow icon={Building2} label="Hospital/Clinic" value={doctor.hospitalOrClinic} />
          )}
          <InfoRow icon={Target} label="Therapy Area" value={doctor.therapyArea} />
          <InfoRow
            icon={Calendar}
            label="Last Interaction"
            value={
              doctor.lastInteractionDate
                ? formatDate(doctor.lastInteractionDate)
                : 'No interaction logged'
            }
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B949E' }}>
            Persona &amp; Style
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${personaColors[doctor.personaType]}`}
            >
              {personaLabels[doctor.personaType]}
            </span>
            <Badge variant="default">{doctor.seniorityLevel}</Badge>
            {doctor.competitorPreference && (
              <Badge variant="warning">Prefers {doctor.competitorPreference}</Badge>
            )}
          </div>
        </div>

        {doctor.likelyConcerns?.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B949E' }}>
              Likely Concerns
            </div>
            <div className="flex flex-wrap gap-1.5">
              {doctor.likelyConcerns.map((c) => (
                <span
                  key={c}
                  className="rounded-lg px-2 py-1 text-xs"
                  style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9' }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {doctor.notes && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8B949E' }}>
              Rep Notes
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#8B949E' }}>
              {doctor.notes}
            </p>
          </div>
        )}
      </div>

      {/* Readiness workflows */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#F0F6FC' }}>
          Readiness Workflows
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map(({ icon: Icon, title, desc, color, bg, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="flex items-start gap-3 rounded-[10px] border p-4 text-left transition-all duration-200"
              style={{ background: '#161B22', borderColor: '#30363D' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = color
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,.5)'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#30363D'
                el.style.boxShadow = 'none'
                el.style.transform = 'none'
              }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: bg }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>
                  {title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                  {desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Visit Prep Sheet panel */}
      {showPrep && (
        <div
          className="rounded-[10px] border space-y-5"
          style={{ background: '#161B22', borderColor: '#30363D' }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-4 border-b"
            style={{ borderColor: '#30363D' }}
          >
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>
                Visit Prep Brief
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                {doctor.fullName} · {doctor.specialty}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={generateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: '#1C2333', borderColor: '#30363D', color: '#8B949E' }}
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
              <button
                onClick={handlePrint}
                disabled={!activePrepContent}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: '#1C2333', borderColor: '#30363D', color: '#8B949E' }}
              >
                <Printer className="h-3 w-3" />
                Print
              </button>
              <button
                onClick={() => setShowPrep(false)}
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: '#484F58' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-5">
            {generateMutation.isPending ? (
              <div className="flex flex-col items-center gap-3 py-12" style={{ color: '#8B949E' }}>
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#F0A500' }} />
                <p className="text-sm">Generating your visit prep brief…</p>
              </div>
            ) : generateMutation.isError ? (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: '#F85149' }}>
                  Failed to generate prep sheet. Check server connection.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleRegenerate}>
                  Try again
                </Button>
              </div>
            ) : activePrepContent ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* LAST VISIT */}
                  <PrepSection label="Last Visit" labelColor="#8B949E">
                    <p className="text-sm leading-relaxed" style={{ color: '#C9D1D9' }}>
                      {activePrepContent.lastVisitSummary}
                    </p>
                  </PrepSection>

                  {/* WHAT THEY CARE ABOUT */}
                  <PrepSection label="What They Care About" labelColor="#8B949E">
                    <div className="flex flex-wrap gap-1.5">
                      {(activePrepContent.whatTheyCareAbout ?? []).map((item) => (
                        <span
                          key={item}
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9' }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </PrepSection>

                  {/* LIKELY OBJECTION */}
                  <PrepSection label="Expect This Objection" labelColor="#D29922">
                    <div
                      className="rounded-lg px-3 py-2.5 text-sm leading-relaxed"
                      style={{ background: '#1C1400', border: '1px solid #3D2E00', color: '#E3B341' }}
                    >
                      {activePrepContent.likelyObjection}
                    </div>
                  </PrepSection>

                  {/* KEY STAT TO OPEN */}
                  <PrepSection label="Lead With This Stat" labelColor="#3FB950">
                    <div
                      className="rounded-lg px-3 py-2.5 text-sm leading-relaxed"
                      style={{ background: '#0D2119', border: '1px solid #1A4D2E', color: '#3FB950' }}
                    >
                      {activePrepContent.keyStatToOpen}
                    </div>
                  </PrepSection>
                </div>

                {/* DO NOT SAY */}
                <div
                  className="rounded-lg px-4 py-3 flex items-start gap-3"
                  style={{ background: '#1C0D0D', border: '1px solid #3D1515' }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider shrink-0 mt-0.5" style={{ color: '#F85149' }}>
                    Do Not Say
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: '#FFA198' }}>
                    {activePrepContent.doNotSay}
                  </p>
                </div>

                {/* OPENING LINE */}
                <div
                  className="rounded-lg px-4 py-3 space-y-2"
                  style={{ background: '#0D1B2A', border: '1px solid #1B3A5C' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#58A6FF' }}>
                      Suggested Opening Line
                    </span>
                    <button
                      onClick={copyOpener}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                      style={{ color: copiedOpener ? '#3FB950' : '#58A6FF' }}
                    >
                      {copiedOpener ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedOpener ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm italic leading-relaxed" style={{ color: '#A5C8FF' }}>
                    "{activePrepContent.openingLine}"
                  </p>
                </div>

                {/* History */}
                {sheets.length > 1 && (
                  <div>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-1.5 text-xs font-medium mt-2"
                      style={{ color: '#8B949E' }}
                    >
                      <ChevronDown
                        className="h-3 w-3 transition-transform"
                        style={{ transform: showHistory ? 'rotate(180deg)' : 'none' }}
                      />
                      Previous prep sheets ({sheets.length - 1})
                    </button>
                    {showHistory && (
                      <div className="mt-2 space-y-1.5">
                        {sheets.slice(1, 4).map((sheet) => (
                          <div
                            key={sheet.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2"
                            style={{ background: '#1C2333', border: '1px solid #30363D' }}
                          >
                            <span className="text-xs" style={{ color: '#8B949E' }}>
                              {formatDate(sheet.createdAt)}
                            </span>
                            <button
                              onClick={() => setActivePrepContent(sheet.content)}
                              className="text-xs font-medium transition-colors"
                              style={{ color: '#58A6FF' }}
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs" style={{ color: '#484F58' }}>
                  For coaching and preparation purposes only. Final field messaging should follow approved medical, legal, and regulatory guidance.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function PrepSection({
  label,
  labelColor,
  children,
}: {
  label: string
  labelColor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: labelColor }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#484F58' }} />
      <div>
        <div className="text-xs" style={{ color: '#484F58' }}>{label}</div>
        <div className="text-sm font-medium" style={{ color: '#C9D1D9' }}>{value}</div>
      </div>
    </div>
  )
}
