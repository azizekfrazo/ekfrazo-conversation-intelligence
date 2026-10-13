import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, MapPin, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DoctorProfile } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { personaColors, personaLabels, doctorPhotoUrl } from '../lib/utils'
import { DoctorFormModal } from '../components/doctors/DoctorFormModal'
import { DEMO_DOCTORS } from '../data/demoDoctors'
import { api } from '../lib/api'

export default function DoctorsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: apiDoctors } = useQuery<DoctorProfile[]>({
    queryKey: ['doctors-all'],
    queryFn: () => api.get('/api/doctors').then(r => r.data.doctors ?? []),
    retry: false,
  })

  const baseList: DoctorProfile[] = (apiDoctors && apiDoctors.length > 0) ? apiDoctors : DEMO_DOCTORS

  const doctors = search.trim()
    ? baseList.filter((d) => {
        const q = search.toLowerCase()
        return (
          d.fullName.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          (d.hospitalOrClinic ?? '').toLowerCase().includes(q)
        )
      })
    : baseList

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Doctor Profiles</h1>
          <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
            Manage doctor profiles and unlock preparation workflows
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> New Doctor
        </Button>
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: '#484F58' }}
        />
        <Input
          placeholder="Search by name, specialty, or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-[10px] border p-10 text-center" style={{ background: '#161B22', borderColor: '#30363D' }}>
          <p className="text-sm" style={{ color: '#8B949E' }}>No doctors match your search.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onClick={() => navigate(`/doctors/${doctor.id}`)}
              onDelete={() => window.alert('Delete is disabled in demo mode.')}
            />
          ))}
        </div>
      )}

      {showForm && (
        <DoctorFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function DoctorCard({
  doctor,
  onClick,
  onDelete,
}: {
  doctor: DoctorProfile
  onClick: () => void
  onDelete: () => void
}) {
  const photoUrl = doctorPhotoUrl(doctor.id, 120, 120)
  const initials = doctor.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="group rounded-[10px] border overflow-hidden cursor-pointer transition-all duration-200"
      style={{ background: '#161B22', borderColor: '#30363D' }}
      onClick={onClick}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#F0A500'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.5)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#30363D'
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Photo */}
            <div
              className="h-[60px] w-[60px] rounded-[10px] overflow-hidden shrink-0 flex items-center justify-center"
              style={{ border: '2px solid #30363D', background: 'linear-gradient(135deg,#1A1F35,#2D3452)' }}
            >
              <img
                src={photoUrl}
                alt={doctor.fullName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <span
                className="font-bold text-sm absolute"
                style={{ color: '#F0F6FC', display: 'none' }}
                id={`initials-${doctor.id}`}
              >
                {initials}
              </span>
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight" style={{ color: '#F0F6FC' }}>
                {doctor.fullName}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                {doctor.specialty}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
            style={{ color: '#484F58' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = '#1F0D0D'
              ;(e.currentTarget as HTMLElement).style.color = '#F85149'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#484F58'
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Location info */}
        <div className="space-y-1.5 mb-4">
          {doctor.hospitalOrClinic && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8B949E' }}>
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{doctor.hospitalOrClinic}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8B949E' }}>
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{doctor.city}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${personaColors[doctor.personaType]}`}
          >
            {personaLabels[doctor.personaType]}
          </span>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#484F58' }}>
            {doctor._count && (
              <>
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: 'rgba(0,180,216,0.1)', color: '#00B4D8', border: '1px solid #003D5C' }}
                  title="Battlecards"
                >
                  {doctor._count.battlecards} BC
                </span>
                <span title="Sessions" style={{ color: '#484F58' }}>
                  {doctor._count.practiceSessions} PS
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
