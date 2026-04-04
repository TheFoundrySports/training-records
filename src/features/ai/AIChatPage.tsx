import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useGenerateWorkout } from './useGenerateWorkout'
import { useCreateWorkout } from '@/features/workouts/hooks/useWorkoutMutations'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WorkoutProposal } from './useGenerateWorkout'

function ProposalCard({
  proposal,
  onSave,
  onDiscard,
  isSaving,
}: {
  proposal: WorkoutProposal
  onSave: () => void
  onDiscard: () => void
  isSaving: boolean
}) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg">{proposal.title}</CardTitle>
          <Badge variant="secondary" className="capitalize shrink-0">
            {proposal.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Duration: </span>
          {proposal.durationMinutes} minutes
        </p>
        {proposal.rpe !== undefined && (
          <p>
            <span className="text-muted-foreground">Expected RPE: </span>
            {proposal.rpe} / 10
          </p>
        )}
        {proposal.notes && (
          <div>
            <p className="text-muted-foreground mb-1">Workout description:</p>
            <p className="whitespace-pre-wrap">{proposal.notes}</p>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save workout'}
          </Button>
          <Button variant="outline" onClick={onDiscard} disabled={isSaving}>
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AIChatPage() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [proposal, setProposal] = useState<WorkoutProposal | null>(null)

  const generateMutation = useGenerateWorkout()
  const createMutation = useCreateWorkout()

  const generateError =
    (generateMutation.error as { error?: { message?: string } } | null)?.error?.message

  const createError =
    (createMutation.error as { error?: { message?: string } } | null)?.error?.message

  async function handleGenerate() {
    if (!prompt.trim()) return
    const result = await generateMutation.mutateAsync(prompt)
    setProposal(result)
  }

  async function handleSave() {
    if (!proposal) return
    await createMutation.mutateAsync(proposal)
    void navigate('/workouts')
  }

  function handleDiscard() {
    setProposal(null)
    generateMutation.reset()
    createMutation.reset()
    setPrompt('')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Generate Workout</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Describe the workout you want to do and AI will generate a structured workout for you.
      </p>

      {(generateError || createError) && (
        <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          {generateError ?? createError}
        </div>
      )}

      <div className="space-y-3">
        <Textarea
          placeholder="e.g. A 45-minute CrossFit workout focused on upper body strength with some conditioning at the end"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={generateMutation.isPending}
          aria-label="Workout prompt"
        />
        <Button
          onClick={() => void handleGenerate()}
          disabled={generateMutation.isPending || !prompt.trim()}
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate'}
        </Button>
      </div>

      {proposal && (
        <ProposalCard
          proposal={proposal}
          onSave={() => void handleSave()}
          onDiscard={handleDiscard}
          isSaving={createMutation.isPending}
        />
      )}
    </div>
  )
}
