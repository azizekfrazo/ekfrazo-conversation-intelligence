import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { DoctorProfile, Product, PersonaType, SeniorityLevel } from '../../types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface Props {
  doctor?: DoctorProfile
  onClose: () => void
  onSuccess: (doctor: DoctorProfile) => void
}

const personaOptions = [
  { value: 'EvidenceDriven', label: 'Evidence-Driven' },
  { value: 'Skeptical', label: 'Skeptical' },
  { value: 'PriceSensitive', label: 'Price-Sensitive' },
  { value: 'BrandLoyal', label: 'Brand-Loyal' },
  { value: 'Busy', label: 'Busy' },
  { value: 'FriendlyButReserved', label: 'Friendly / Reserved' },
]

const seniorityOptions = [
  { value: 'Junior', label: 'Junior' },
  { value: 'MidLevel', label: 'Mid-Level' },
  { value: 'Senior', label: 'Senior' },
  { value: 'HoD', label: 'Head of Department' },
]

export function DoctorFormModal({ doctor, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const isEdit = !!doctor

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/products').then((r) => r.data),
  })

  const [form, setForm] = useState({
    fullName: doctor?.fullName ?? '',
    specialty: doctor?.specialty ?? '',
    city: doctor?.city ?? '',
    hospitalOrClinic: doctor?.hospitalOrClinic ?? '',
    personaType: doctor?.personaType ?? 'EvidenceDriven',
    seniorityLevel: doctor?.seniorityLevel ?? 'Senior',
    therapyArea: doctor?.therapyArea ?? '',
    targetProduct: doctor?.targetProduct ?? '',
    likelyConcerns: doctor?.likelyConcerns ?? [''],
    competitorPreference: doctor?.competitorPreference ?? '',
    notes: doctor?.notes ?? '',
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form & { userId: string }) =>
      isEdit
        ? api.put<{ doctor: DoctorProfile }>(`/api/doctors/${doctor!.id}`, data).then((r) => r.data.doctor)
        : api.post<{ doctor: DoctorProfile }>('/api/doctors', data).then((r) => r.data.doctor),
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      likelyConcerns: form.likelyConcerns.filter((c) => c.trim()),
      userId: user!.id,
    })
  }

  const updateConcern = (i: number, val: string) => {
    const arr = [...form.likelyConcerns]
    arr[i] = val
    setForm((f) => ({ ...f, likelyConcerns: arr }))
  }

  const products = productsData?.products ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#161B22', border: '1px solid #30363D' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #30363D' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#F0F6FC' }}>
            {isEdit ? 'Edit Doctor Profile' : 'New Doctor Profile'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#484F58' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = '#21262D'
              ;(e.currentTarget as HTMLElement).style.color = '#C9D1D9'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#484F58'
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {mutation.isError && (
            <div className="rounded-lg p-3 text-sm" style={{ background: '#1F0D0D', border: '1px solid #5C1C1A', color: '#F85149' }}>
              {mutation.error.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Dr. Ananya Krishnamurti"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialty">Specialty *</Label>
              <Input
                id="specialty"
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="Cardiology"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Bengaluru"
                required
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="hospital">Hospital / Clinic</Label>
              <Input
                id="hospital"
                value={form.hospitalOrClinic}
                onChange={(e) => setForm((f) => ({ ...f, hospitalOrClinic: e.target.value }))}
                placeholder="Apollo Hospitals, Bengaluru"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Persona Type *</Label>
              <Select
                value={form.personaType}
                onValueChange={(v) => setForm((f) => ({ ...f, personaType: v as PersonaType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {personaOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Seniority Level *</Label>
              <Select
                value={form.seniorityLevel}
                onValueChange={(v) => setForm((f) => ({ ...f, seniorityLevel: v as SeniorityLevel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seniorityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="therapyArea">Therapy Area *</Label>
              <Input
                id="therapyArea"
                value={form.therapyArea}
                onChange={(e) => setForm((f) => ({ ...f, therapyArea: e.target.value }))}
                placeholder="Cardiology"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Product *</Label>
              <Select
                value={form.targetProduct}
                onValueChange={(v) => setForm((f) => ({ ...f, targetProduct: v }))}
              >
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

          <div className="space-y-2">
            <Label>Likely Concerns</Label>
            {form.likelyConcerns.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={c}
                  onChange={(e) => updateConcern(i, e.target.value)}
                  placeholder="e.g. Long-term safety data"
                />
                {form.likelyConcerns.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        likelyConcerns: f.likelyConcerns.filter((_, j) => j !== i),
                      }))
                    }
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, likelyConcerns: [...f.likelyConcerns, ''] }))}
            >
              <Plus className="h-3 w-3" /> Add concern
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="competitor">Competitor Preference</Label>
            <Input
              id="competitor"
              value={form.competitorPreference}
              onChange={(e) => setForm((f) => ({ ...f, competitorPreference: e.target.value }))}
              placeholder="e.g. Amiodarex"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="What do you know about this doctor that'll help in meetings?"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              {isEdit ? 'Save Changes' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
