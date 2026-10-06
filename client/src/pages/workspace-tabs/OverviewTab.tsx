import { useNavigate } from 'react-router-dom'
import { FileText, Mic, Phone, MapPin, Building2, Calendar, Target } from 'lucide-react'
import { DoctorProfile } from '../../types'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { formatDate, personaLabels, personaColors } from '../../lib/utils'

interface Props {
  doctor: DoctorProfile
  onTabChange: (tab: string) => void
}

export function OverviewTab({ doctor, onTabChange }: Props) {
  const navigate = useNavigate()

  const actions = [
    {
      icon: FileText,
      title: 'Generate Battlecard',
      desc: 'AI-powered call prep for this doctor',
      color: '#58A6FF',
      bg: '#0D2137',
      onClick: () => onTabChange('battlecards'),
    },
    {
      icon: Mic,
      title: 'Start Voice Practice',
      desc: 'Roleplay objections in voice mode',
      color: '#BC8CFF',
      bg: '#1F1635',
      onClick: () => navigate(`/doctors/${doctor.id}/simulator`),
    },
    {
      icon: Phone,
      title: 'Post-Call Analysis',
      desc: 'Analyze a meeting transcript',
      color: '#3FB950',
      bg: '#12201A',
      onClick: () => onTabChange('postcall'),
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
        <div className="grid sm:grid-cols-3 gap-3">
          {actions.map(({ icon: Icon, title, desc, color, bg, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="flex items-start gap-3 rounded-[10px] border p-4 text-left transition-all duration-200"
              style={{ background: '#161B22', borderColor: '#30363D' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#F0A500'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.5)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#30363D'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
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
