import { useQuery } from '@tanstack/react-query'
import { UserPlus, FileText, Mic, Phone, StickyNote, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import { TimelineEvent } from '../../types'
import { formatRelative } from '../../lib/utils'

const typeConfig: Record<
  TimelineEvent['type'],
  { icon: typeof Clock; iconColor: string; bg: string }
> = {
  doctor_created:      { icon: UserPlus,  iconColor: '#F0A500', bg: 'rgba(240,165,0,0.1)' },
  battlecard_generated:{ icon: FileText,  iconColor: '#58A6FF', bg: '#0D2137' },
  practice_session:    { icon: Mic,       iconColor: '#BC8CFF', bg: '#1F1635' },
  postcall_analysis:   { icon: Phone,     iconColor: '#3FB950', bg: '#12201A' },
  note_added:          { icon: StickyNote,iconColor: '#D29922', bg: '#261900' },
}

export function TimelinePanel({ doctorId }: { doctorId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['timeline', doctorId],
    queryFn: () =>
      api
        .get<{ events: TimelineEvent[] }>(`/api/doctors/${doctorId}/timeline`)
        .then((r) => r.data),
  })

  const events = data?.events ?? []

  return (
    <div className="p-4">
      <div className="section-label mb-4">Activity Timeline</div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-7 w-7 rounded-lg shrink-0" style={{ background: '#1C2333' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded w-4/5" style={{ background: '#1C2333' }} />
                <div className="h-2.5 rounded w-1/2" style={{ background: '#1C2333' }} />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: '#484F58' }}>
          No activity yet
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => {
            const config = typeConfig[event.type] ?? typeConfig.doctor_created
            const Icon = config.icon
            return (
              <div key={event.id} className="flex gap-3">
                <div className="relative flex flex-col items-center shrink-0">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center"
                    style={{ background: config.bg }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: config.iconColor }} />
                  </div>
                  {i < events.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1.5"
                      style={{ background: '#30363D', minHeight: 12 }}
                    />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-xs leading-snug" style={{ color: '#C9D1D9' }}>
                    {event.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#484F58' }}>
                    {formatRelative(event.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
