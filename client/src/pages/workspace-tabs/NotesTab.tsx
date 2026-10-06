import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, StickyNote } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { DoctorProfile, Note } from '../../types'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { EmptyState } from '../../components/shared/EmptyState'
import { formatRelative } from '../../lib/utils'

interface Props { doctor: DoctorProfile }

export function NotesTab({ doctor }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [newNote, setNewNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['notes', doctor.id],
    queryFn: () =>
      api.get<{ notes: Note[] }>(`/api/doctors/${doctor.id}/notes`).then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/api/doctors/${doctor.id}/notes`, { content: newNote, userId: user!.id })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', doctor.id] })
      qc.invalidateQueries({ queryKey: ['timeline', doctor.id] })
      setNewNote('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) =>
      api.delete(`/api/doctors/${doctor.id}/notes/${noteId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', doctor.id] }),
  })

  const notes = data?.notes ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this doctor…"
            rows={3}
          />
          <Button
            size="sm"
            onClick={() => addMutation.mutate()}
            loading={addMutation.isPending}
            disabled={!newNote.trim()}
          >
            Save Note
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Add notes about this doctor to track context between visits."
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatRelative(note.createdAt)}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(note.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
