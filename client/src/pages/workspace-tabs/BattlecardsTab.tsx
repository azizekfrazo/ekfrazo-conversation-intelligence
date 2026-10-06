import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { DoctorProfile, Battlecard, Product, BattlecardContent } from '../../types'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { EmptyState } from '../../components/shared/EmptyState'
import { formatRelative } from '../../lib/utils'

interface Props { doctor: DoctorProfile }

export function BattlecardsTab({ doctor }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [selectedProductId, setSelectedProductId] = useState(doctor.targetProduct)
  const [repNotes, setRepNotes] = useState('')
  const [activeBattlecardId, setActiveBattlecardId] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/products').then((r) => r.data),
  })

  const { data: battlecardsData, isLoading } = useQuery({
    queryKey: ['battlecards', doctor.id],
    queryFn: () =>
      api
        .get<{ battlecards: Battlecard[] }>(`/api/battlecards/${doctor.id}/battlecards`)
        .then((r) => r.data),
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ battlecard: Battlecard }>('/api/battlecards/generate', {
          doctorId: doctor.id,
          productId: selectedProductId,
          userId: user!.id,
          repNotes: repNotes || undefined,
        })
        .then((r) => r.data.battlecard),
    onSuccess: (battlecard) => {
      qc.invalidateQueries({ queryKey: ['battlecards', doctor.id] })
      qc.invalidateQueries({ queryKey: ['timeline', doctor.id] })
      setActiveBattlecardId(battlecard.id)
    },
  })

  const battlecards = battlecardsData?.battlecards ?? []
  const products = productsData?.products ?? []
  const activeBattlecard = battlecards.find((b) => b.id === activeBattlecardId) ?? battlecards[0]

  return (
    <div className="space-y-5">
      {/* Generate panel */}
      <div
        className="rounded-[10px] border p-5 space-y-4"
        style={{ background: '#161B22', borderColor: '#30363D' }}
      >
        <div>
          <h3 className="font-semibold" style={{ color: '#F0F6FC' }}>
            Generate Battlecard
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
            AI will tailor the battlecard to Dr. {doctor.fullName.split(' ').slice(-1)[0]}'s persona and
            concerns
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>
              Product
            </label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
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
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>
            Your notes for this visit (optional)
          </label>
          <Textarea
            value={repNotes}
            onChange={(e) => setRepNotes(e.target.value)}
            placeholder="e.g. She asked about elderly dosing last time. Lead with safety data."
            rows={2}
          />
        </div>

        {generateMutation.isError && (
          <div
            className="text-sm rounded-lg p-3"
            style={{ background: '#1F0D0D', border: '1px solid #5C1C1A', color: '#F85149' }}
          >
            {generateMutation.error.message}
          </div>
        )}

        <Button
          onClick={() => generateMutation.mutate()}
          loading={generateMutation.isPending}
          disabled={!selectedProductId}
        >
          <Zap className="h-4 w-4" />
          {generateMutation.isPending ? 'Generating…' : 'Generate Battlecard'}
        </Button>
      </div>

      {/* Battlecard history pills */}
      {battlecards.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {battlecards.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBattlecardId(b.id)}
              className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150"
              style={
                (activeBattlecardId ?? battlecards[0]?.id) === b.id
                  ? { background: '#F0A500', color: '#0D1117', borderColor: '#F0A500' }
                  : { background: '#1C2333', color: '#8B949E', borderColor: '#30363D' }
              }
            >
              {b.product?.productName} — {formatRelative(b.createdAt)}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-[10px] animate-pulse" style={{ background: '#161B22' }} />
          ))}
        </div>
      ) : !activeBattlecard ? (
        <EmptyState
          icon={Zap}
          title="No battlecard yet"
          description="Generate your first battlecard to get AI-powered preparation for this doctor."
        />
      ) : (
        <BattlecardView battlecard={activeBattlecard} onRegenerate={() => generateMutation.mutate()} />
      )}

    </div>
  )
}

function BattlecardView({
  battlecard,
  onRegenerate,
}: {
  battlecard: Battlecard
  onRegenerate: () => void
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    questions: true,
    talking: true,
    objections: false,
    whatnot: false,
    checklist: false,
  })
  const c = battlecard.content as BattlecardContent
  const toggle = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }))

  return (
    <div className="space-y-4">
      {/* One-liner hero */}
      <div
        className="rounded-[10px] p-5"
        style={{
          background: 'linear-gradient(135deg, #1A1200 0%, #261900 100%)',
          border: '1px solid #4D3200',
        }}
      >
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#D29922' }}>
          One-Line Pitch
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#F0F6FC' }}>
          {c.oneLiner}
        </p>
        <div className="flex items-center gap-2 mt-4">
          <CopyTextButton text={c.oneLiner} />
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{ color: '#D29922', background: 'rgba(240,165,0,0.08)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.16)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.08)'
            }}
          >
            <RefreshCw className="h-3 w-3" /> Regenerate
          </button>
        </div>
      </div>

      {/* Sections */}
      <Section
        title="Likely Questions &amp; Responses"
        count={c.likelyQuestions?.length}
        open={openSections.questions}
        onToggle={() => toggle('questions')}
      >
        <div className="space-y-4">
          {c.likelyQuestions?.map((q, i) => (
            <div
              key={i}
              className="rounded-[10px] p-4"
              style={{ background: '#1C2333', border: '1px solid #30363D' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium" style={{ color: '#C9D1D9' }}>
                  Q: {q.question}
                </p>
                <CopyTextButton text={`Q: ${q.question}\nA: ${q.suggestedResponse}`} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#8B949E' }}>
                <span className="font-semibold" style={{ color: '#F0A500' }}>A:</span>{' '}
                {q.suggestedResponse}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Talking Points"
        count={c.talkingPoints?.length}
        open={openSections.talking}
        onToggle={() => toggle('talking')}
      >
        <ul className="space-y-2">
          {c.talkingPoints?.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: '#C9D1D9' }}>
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(240,165,0,0.12)', color: '#F0A500' }}
              >
                {i + 1}
              </div>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Objections to Anticipate"
        count={c.objectionsToAnticipate?.length}
        open={openSections.objections}
        onToggle={() => toggle('objections')}
      >
        <div className="space-y-3">
          {c.objectionsToAnticipate?.map((o, i) => (
            <div
              key={i}
              className="rounded-[10px] p-4"
              style={{ background: '#261900', border: '1px solid #4D3200' }}
            >
              <p className="text-sm font-medium mb-1.5" style={{ color: '#D29922' }}>
                ⚠ {o.objection}
              </p>
              <p className="text-sm" style={{ color: '#C9D1D9' }}>
                {o.response}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="What NOT to Say"
        count={c.whatNotToSay?.length}
        open={openSections.whatnot}
        onToggle={() => toggle('whatnot')}
      >
        <ul className="space-y-2">
          {c.whatNotToSay?.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#F85149' }}>
              <span className="shrink-0 mt-0.5">✗</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Pre-Meeting Confidence Checklist"
        count={c.confidenceChecklist?.length}
        open={openSections.checklist}
        onToggle={() => toggle('checklist')}
      >
        <ul className="space-y-2">
          {c.confidenceChecklist?.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#C9D1D9' }}>
              <span className="shrink-0 mt-0.5" style={{ color: '#3FB950' }}>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {battlecard.repNotes && (
        <div
          className="rounded-[10px] border p-4"
          style={{ background: '#161B22', borderColor: '#30363D' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#484F58' }}>
            Your Notes
          </div>
          <p className="text-sm" style={{ color: '#8B949E' }}>
            {battlecard.repNotes}
          </p>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string
  count?: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[10px] border overflow-hidden"
      style={{ background: '#161B22', borderColor: '#30363D' }}
    >
      <button
        className="w-full flex items-center justify-between p-5 text-left transition-colors duration-150"
        onClick={onToggle}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = '#1C2333'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        <span className="font-semibold text-sm" style={{ color: '#F0F6FC' }}>
          {title}
          {count !== undefined && (
            <span className="ml-2 text-xs font-normal" style={{ color: '#484F58' }}>
              ({count})
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" style={{ color: '#484F58' }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: '#484F58' }} />
        )}
      </button>
      {open && (
        <div className="pb-5 px-5">{children}</div>
      )}
    </div>
  )
}

function CopyTextButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg transition-all duration-150 shrink-0"
      style={{ color: '#484F58' }}
      title="Copy"
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = '#21262D'
        ;(e.currentTarget as HTMLElement).style.color = '#C9D1D9'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = '#484F58'
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" style={{ color: '#3FB950' }} /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
