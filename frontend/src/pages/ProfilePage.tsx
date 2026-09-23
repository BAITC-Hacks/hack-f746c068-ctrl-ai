import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ProgressResult } from '../types'
import { useCompleteActivity, useProfile, useRecommendations, useRejectActivity } from '../hooks/queries'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { SkillGapChart } from '../components/profile/SkillGapChart'
import { GapList } from '../components/profile/GapList'
import { RecommendationCard } from '../components/recommendations/RecommendationCard'
import { CompleteModal } from '../components/progress/CompleteModal'
import { EmptyState, ErrorState, Skeleton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const profile = useProfile(id)
  const recs = useRecommendations(id)
  const complete = useCompleteActivity(id)
  const reject = useRejectActivity(id)

  const [pending, setPending] = useState<{ aid: string; kind: 'complete' | 'skip' | 'decline' } | null>(null)
  const [result, setResult] = useState<ProgressResult | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)

  const onComplete = (aid: string) => {
    setPending({ aid, kind: 'complete' })
    complete.mutate(aid, {
      onSuccess: (r) => { setResult(r); setHighlight(r.skill) },
      onSettled: () => setPending(null),
    })
  }
  const onReject = (aid: string, action: 'skip' | 'decline') => {
    setPending({ aid, kind: action })
    reject.mutate({ aid, action }, { onSettled: () => setPending(null) })
  }

  if (profile.error) return <ErrorState error={profile.error} onRetry={profile.refetch} />

  return (
    <div className="space-y-6">
      {session?.role === 'hr' && <Link to="/" className="inline-flex rounded-full bg-white/60 px-4 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-black/5 backdrop-blur transition hover:bg-white hover:text-slate-900">← Все сотрудники</Link>}

      {profile.data ? <ProfileHeader profile={profile.data} /> : <Skeleton className="h-28" />}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {profile.data ? (
          <SkillGapChart skills={profile.data.skills} nextGrade={profile.data.nextGrade} highlight={highlight} />
        ) : <Skeleton className="h-72" />}
        {profile.data ? <GapList gaps={profile.data.gaps} /> : <Skeleton className="h-72" />}
      </div>

      <section>
        <div className="mb-5 mt-4 flex items-baseline justify-between">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Рекомендации</h2>
          <span className="hidden text-xs text-slate-500 sm:inline">ранжирование — детерминированный scoring, текст — LLM</span>
        </div>

        {recs.error && <ErrorState error={recs.error} onRetry={recs.refetch} />}

        {recs.isLoading && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Подбираем активности и формируем объяснения…</p>
            <Skeleton className="h-56" /><Skeleton className="h-40" />
          </div>
        )}

        {recs.data && recs.data.length === 0 && (
          <EmptyState
            title="Нет подходящих активностей"
            text={profile.data?.gaps.length
              ? 'По текущим разрывам в каталоге нет доступных активностей — сотрудник попадёт в HR-отчёт.'
              : 'Все разрывы закрыты.'}
          />
        )}

        <div className="space-y-4">
          {recs.data?.map((r, i) => (
            <RecommendationCard
              key={r.activityId}
              rec={r}
              rank={i + 1}
              busy={pending?.aid === r.activityId ? pending.kind : null}
              disabled={!!pending}
              onComplete={() => onComplete(r.activityId)}
              onSkip={() => onReject(r.activityId, 'skip')}
              onDecline={() => onReject(r.activityId, 'decline')}
            />
          ))}
        </div>
      </section>

      <CompleteModal result={result} onClose={() => { setResult(null); setTimeout(() => setHighlight(null), 2500) }} />
    </div>
  )
}
