import { supabase } from './supabase'
import { pushNotification } from '../components/NotificationProvider'
import { ACHIEVEMENT_MAP } from '../data/achievements'
import type { ChallengeQuestion, Challenge, ChallengeAttempt, UserStreak, ChallengeModifier } from '../types/challenge'
import type { DocMeta, Subject } from '../types/doc'
import type { VideoMeta, VideoNote } from '../types/video'

/* ── Helpers ──────────────────────────────────────────── */

function uid(): string {
  return crypto.randomUUID()
}

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    return user.id
  }
  return session.user.id
}

/* ═══════════════════════════════════════════════════════════
   QUESTIONS
   ═══════════════════════════════════════════════════════════ */

export async function fetchQuestions(): Promise<ChallengeQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToQuestion)
}

export async function createQuestion(q: ChallengeQuestion): Promise<ChallengeQuestion> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('questions')
    .insert(questionToRow(q, userId))

  if (error) throw error
  return q
}

function questionToUpdateRow(q: ChallengeQuestion): Record<string, unknown> {
  return {
    type: q.type,
    title: q.title,
    subject: q.subject,
    difficulty: q.difficulty,
    content: q.content || null,
    image_url: q.imageUrl || null,
    explanation: q.explanation || null,
    options: q.options,
    statements: q.statements,
    order_items: q.orderItems,
    blanks: q.blanks,
    open_expected_text: q.openExpectedText || null,
    source: q.source || null,
  }
}

export async function updateQuestion(q: ChallengeQuestion): Promise<ChallengeQuestion> {
  const { error } = await supabase
    .from('questions')
    .update(questionToUpdateRow(q))
    .eq('id', q.id)

  if (error) throw error
  return q
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw error
}

function rowToQuestion(row: Record<string, unknown>): ChallengeQuestion {
  return {
    id: row.id as string,
    type: row.type as ChallengeQuestion['type'],
    title: row.title as string,
    subject: row.subject as ChallengeQuestion['subject'],
    difficulty: (row.difficulty as ChallengeQuestion['difficulty']) || 'medio',
    content: (row.content as string) || undefined,
    imageUrl: (row.image_url as string) || undefined,
    explanation: (row.explanation as string) || undefined,
    options: (row.options as ChallengeQuestion['options']) || [],
    statements: (row.statements as ChallengeQuestion['statements']) || [],
    orderItems: (row.order_items as ChallengeQuestion['orderItems']) || [],
    blanks: (row.blanks as ChallengeQuestion['blanks']) || [],
    openExpectedText: (row.open_expected_text as string) || undefined,
    source: (row.source as string) || undefined,
  }
}

function questionToRow(q: ChallengeQuestion, userId: string): Record<string, unknown> {
  return {
    id: q.id,
    user_id: userId,
    type: q.type,
    title: q.title,
    subject: q.subject,
    difficulty: q.difficulty,
    content: q.content || null,
    image_url: q.imageUrl || null,
    explanation: q.explanation || null,
    options: q.options,
    statements: q.statements,
    order_items: q.orderItems,
    blanks: q.blanks,
    open_expected_text: q.openExpectedText || null,
    source: q.source || null,
  }
}

/* ═══════════════════════════════════════════════════════════
   CHALLENGES
   ═══════════════════════════════════════════════════════════ */

export async function fetchChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToChallenge)
}

export async function createChallenge(c: Challenge): Promise<Challenge> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('challenges')
    .insert(challengeToRow(c, userId))

  if (error) throw error
  return c
}

function challengeToUpdateRow(c: Challenge): Record<string, unknown> {
  return {
    title: c.title,
    description: c.description || null,
    subject: c.subject,
    cross_subjects: c.crossSubjects || [],
    difficulty: c.difficulty,
    question_ids: c.questionIds,
    xp_base: c.xpBase,
    is_daily: c.isDaily,
    daily_date: c.dailyDate || null,
    modifiers: c.modifiers || [],
    aposta_cega_min: c.apostaCegaMin || null,
  }
}

export async function updateChallenge(c: Challenge): Promise<Challenge> {
  const { error } = await supabase
    .from('challenges')
    .update(challengeToUpdateRow(c))
    .eq('id', c.id)

  if (error) throw error
  return c
}

export async function deleteChallenge(id: string): Promise<void> {
  const { error } = await supabase.from('challenges').delete().eq('id', id)
  if (error) throw error
}

function rowToChallenge(row: Record<string, unknown>): Challenge {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || undefined,
    subject: row.subject as Challenge['subject'],
    crossSubjects: (row.cross_subjects as Challenge['crossSubjects']) || undefined,
    difficulty: row.difficulty as Challenge['difficulty'],
    questionIds: (row.question_ids as string[]) || [],
    xpBase: row.xp_base as number,
    isDaily: row.is_daily as boolean,
    dailyDate: (row.daily_date as string) || undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    modifiers: (row.modifiers as ChallengeModifier[]) || [],
    apostaCegaMin: (row.aposta_cega_min as number) || undefined,
  }
}

function challengeToRow(c: Challenge, userId: string): Record<string, unknown> {
  return {
    id: c.id,
    user_id: userId,
    title: c.title,
    description: c.description || null,
    subject: c.subject,
    cross_subjects: c.crossSubjects || [],
    difficulty: c.difficulty,
    question_ids: c.questionIds,
    xp_base: c.xpBase,
    is_daily: c.isDaily,
    daily_date: c.dailyDate || null,
    modifiers: c.modifiers || [],
    aposta_cega_min: c.apostaCegaMin || null,
  }
}

/* ═══════════════════════════════════════════════════════════
   ATTEMPTS
   ═══════════════════════════════════════════════════════════ */

export async function fetchAttempts(): Promise<ChallengeAttempt[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('challenge_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })

  if (error) throw error
  return data.map(rowToAttempt)
}

export async function createAttempt(a: ChallengeAttempt): Promise<ChallengeAttempt> {
  const userId = await getUserId()
  const id = uid()
  const { error } = await supabase
    .from('challenge_attempts')
    .insert({
      id,
      user_id: userId,
      challenge_id: a.challengeId,
      answers: a.answers,
      total_time_ms: a.totalTimeMs,
      correct_count: a.correctCount,
      wrong_count: a.wrongCount,
      score: a.score,
      xp_earned: a.xpEarned,
      completed_at: new Date(a.completedAt).toISOString(),
    })

  if (error) throw error
  return { ...a, id }
}

function rowToAttempt(row: Record<string, unknown>): ChallengeAttempt {
  return {
    id: row.id as string,
    challengeId: row.challenge_id as string,
    answers: (row.answers as ChallengeAttempt['answers']) || [],
    totalTimeMs: row.total_time_ms as number,
    correctCount: row.correct_count as number,
    wrongCount: row.wrong_count as number,
    score: row.score as number,
    xpEarned: row.xp_earned as number,
    completedAt: new Date(row.completed_at as string).getTime(),
  }
}

/* ═══════════════════════════════════════════════════════════
   USER STREAKS
   ═══════════════════════════════════════════════════════════ */

export async function fetchStreak(): Promise<UserStreak> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastChallengeDate: null,
      totalXp: 0,
      totalWatchSeconds: 0,
      videosWatched: 0,
      docsCreated: 0,
      challengesCompleted: 0,
      simuladosCompleted: 0,
      notesCreated: 0,
      loginDays: 0,
      lastLoginDate: null,
      videosWatchedToday: 0,
      videosWatchedDate: null,
      watchedSubjects: [],
      completedSimuladoYears: [],
      bestSimuladoScore: 0,
      simuladosThisWeek: 0,
      lastSimuladoWeek: null,
    }
  }

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastChallengeDate: data.last_challenge_date,
    totalXp: data.total_xp,
    totalWatchSeconds: data.total_watch_seconds || 0,
    videosWatched: data.videos_watched || 0,
    docsCreated: data.docs_created || 0,
    challengesCompleted: data.challenges_completed || 0,
    simuladosCompleted: data.simulados_completed || 0,
    notesCreated: data.notes_created || 0,
    loginDays: data.login_days || 0,
    lastLoginDate: data.last_login_date || null,
    videosWatchedToday: data.videos_watched_today || 0,
    videosWatchedDate: data.videos_watched_date || null,
    watchedSubjects: data.watched_subjects || [],
    completedSimuladoYears: data.completed_simulado_years || [],
    bestSimuladoScore: data.best_simulado_score || 0,
    simuladosThisWeek: data.simulados_this_week || 0,
    lastSimuladoWeek: data.last_simulado_week || null,
  }
}

export async function upsertStreak(s: UserStreak): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('user_streaks')
    .upsert({
      user_id: userId,
      current_streak: s.currentStreak,
      longest_streak: s.longestStreak,
      last_challenge_date: s.lastChallengeDate,
      total_xp: s.totalXp,
      total_watch_seconds: s.totalWatchSeconds,
      videos_watched: s.videosWatched,
      docs_created: s.docsCreated,
      challenges_completed: s.challengesCompleted,
      simulados_completed: s.simuladosCompleted,
      notes_created: s.notesCreated,
      login_days: s.loginDays,
      last_login_date: s.lastLoginDate,
      videos_watched_today: s.videosWatchedToday,
      videos_watched_date: s.videosWatchedDate,
      watched_subjects: s.watchedSubjects,
      completed_simulado_years: s.completedSimuladoYears,
      best_simulado_score: s.bestSimuladoScore,
      simulados_this_week: s.simuladosThisWeek,
      last_simulado_week: s.lastSimuladoWeek,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) throw error
}

/* ═══════════════════════════════════════════════════════════
   DOCUMENTS
   ═══════════════════════════════════════════════════════════ */

export async function fetchMyDocs(): Promise<DocMeta[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToDoc)
}

export async function fetchPublicDocs(): Promise<DocMeta[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToDoc)
}

export async function createDoc(d: DocMeta): Promise<DocMeta> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('documents')
    .insert(docToRow(d, userId))

  if (error) throw error
  return d
}

function docToUpdateRow(d: DocMeta): Record<string, unknown> {
  return {
    title: d.title,
    description: d.description || null,
    doc_type: d.type,
    subject: d.subject || null,
    content: d.content || null,
    file_name: d.fileName || null,
    file_url: d.fileUrl || null,
    file_size: d.fileSize || null,
    thumbnail: d.thumbnail || null,
    paper_style: d.paperStyle || null,
    is_public: d.isPublic,
  }
}

export async function updateDoc(d: DocMeta): Promise<DocMeta> {
  const { error } = await supabase
    .from('documents')
    .update(docToUpdateRow(d))
    .eq('id', d.id)

  if (error) throw error
  return d
}

export async function deleteDoc(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

function rowToDoc(row: Record<string, unknown>): DocMeta {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    type: row.doc_type as 'editor' | 'pdf',
    subject: (row.subject as Subject) || null,
    content: (row.content as DocMeta['content']) || undefined,
    fileName: (row.file_name as string) || undefined,
    fileUrl: (row.file_url as string) || undefined,
    fileSize: (row.file_size as number) || undefined,
    thumbnail: (row.thumbnail as string) || undefined,
    isPublic: row.is_public as boolean,
    paperStyle: (row.paper_style as DocMeta['paperStyle']) || undefined,
    authorName: undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

function docToRow(d: DocMeta, userId: string): Record<string, unknown> {
  return {
    id: d.id,
    user_id: userId,
    title: d.title,
    description: d.description || null,
    doc_type: d.type,
    subject: d.subject || null,
    content: d.content || null,
    file_name: d.fileName || null,
    file_url: d.fileUrl || null,
    file_size: d.fileSize || null,
    thumbnail: d.thumbnail || null,
    paper_style: d.paperStyle || null,
    is_public: d.isPublic,
  }
}

/* ═══════════════════════════════════════════════════════════
   VIDEOS
   ═══════════════════════════════════════════════════════════ */

export async function fetchVideos(): Promise<VideoMeta[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToVideo)
}

export async function createVideo(v: VideoMeta): Promise<VideoMeta> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('videos')
    .insert(videoToRow(v, userId))

  if (error) throw error
  return v
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', id)
  if (error) throw error
}

export async function updateVideoDuration(id: string, duration: string): Promise<void> {
  const { error } = await supabase.from('videos').update({ duration }).eq('id', id)
  if (error) throw error
}

function rowToVideo(row: Record<string, unknown>): VideoMeta {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    subject: row.subject as VideoMeta['subject'],
    videoUrl: row.video_url as string,
    thumbnail: (row.thumbnail as string) || undefined,
    duration: (row.duration as string) || undefined,
    authorName: (row.author_name as string) || undefined,
    isPublic: row.is_public as boolean,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

function videoToRow(v: VideoMeta, userId: string): Record<string, unknown> {
  return {
    id: v.id,
    user_id: userId,
    title: v.title,
    description: v.description || null,
    subject: v.subject,
    video_url: v.videoUrl,
    thumbnail: v.thumbnail || null,
    duration: v.duration || null,
    author_name: v.authorName || null,
    is_public: v.isPublic,
  }
}

/* ═══════════════════════════════════════════════════════════
   VIDEO NOTES
   ═══════════════════════════════════════════════════════════ */

export async function fetchVideoNotes(videoId: string): Promise<VideoNote[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('video_notes')
    .select('*')
    .eq('video_id', videoId)
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })

  if (error) throw error
  return (data || []).map(row => ({
    id: row.id as string,
    videoId: row.video_id as string,
    text: row.text as string,
    timestamp: row.timestamp as number,
    createdAt: new Date(row.created_at as string).getTime(),
    groupId: row.group_id as string | null,
  }))
}

export async function createVideoNote(note: VideoNote): Promise<VideoNote> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('video_notes')
    .insert({
      id: note.id,
      user_id: userId,
      video_id: note.videoId,
      text: note.text,
      timestamp: Math.round(note.timestamp),
      group_id: note.groupId ?? null,
    })

  if (error) {
    console.error('[Supabase video_notes insert]', error.message, error.details, error.hint)
    throw error
  }
  return note
}

export async function deleteVideoNote(id: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('video_notes').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function deleteAllVideoNotes(videoId: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('video_notes').delete().eq('video_id', videoId).eq('user_id', userId)
  if (error) throw error
}

/* ═══════════════════════════════════════════════════════════
   NOTE GROUPS
   ═══════════════════════════════════════════════════════════ */

export interface NoteGroup {
  id: string
  videoId: string
  name: string
  sortOrder: number
  createdAt: number
}

export async function fetchNoteGroups(videoId: string): Promise<NoteGroup[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('note_groups')
    .select('*')
    .eq('video_id', videoId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data || []).map(row => ({
    id: row.id as string,
    videoId: row.video_id as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
    createdAt: new Date(row.created_at as string).getTime(),
  }))
}

export async function createNoteGroup(group: NoteGroup): Promise<NoteGroup> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('note_groups')
    .insert({
      id: group.id,
      user_id: userId,
      video_id: group.videoId,
      name: group.name,
      sort_order: group.sortOrder,
    })
  if (error) throw error
  return group
}

export async function updateNoteGroup(id: string, patch: { name?: string; sortOrder?: number }): Promise<void> {
  const userId = await getUserId()
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder
  const { error } = await supabase
    .from('note_groups')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteNoteGroup(id: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('note_groups').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function assignNoteToGroup(noteId: string, groupId: string | null): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('video_notes')
    .update({ group_id: groupId })
    .eq('id', noteId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function assignNotesToGroup(noteIds: string[], groupId: string | null): Promise<void> {
  if (noteIds.length === 0) return
  const userId = await getUserId()
  const { error } = await supabase
    .from('video_notes')
    .update({ group_id: groupId })
    .in('id', noteIds)
    .eq('user_id', userId)
  if (error) throw error
}

/* ═══════════════════════════════════════════════════════════
   GOALS
   ═══════════════════════════════════════════════════════════ */

export interface Goal {
  id: string
  text: string
  done: boolean
  createdAt: number
  completedAt: number | null
}

export async function fetchGoals(): Promise<Goal[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map(row => ({
    id: row.id as string,
    text: row.text as string,
    done: row.done as boolean,
    createdAt: new Date(row.created_at as string).getTime(),
    completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : null,
  }))
}

export async function createGoal(text: string): Promise<Goal> {
  const userId = await getUserId()
  const id = uid()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('goals')
    .insert({ id, user_id: userId, text, done: false, created_at: now })

  if (error) throw error
  return { id, text, done: false, createdAt: Date.now(), completedAt: null }
}

export async function updateGoal(id: string, updates: { text?: string; done?: boolean; completedAt?: number | null }): Promise<void> {
  const row: Record<string, unknown> = {}
  if (updates.text !== undefined) row.text = updates.text
  if (updates.done !== undefined) row.done = updates.done
  if (updates.completedAt !== undefined) row.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null
  const { error } = await supabase.from('goals').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

/* ═══════════════════════════════════════════════════════════
   COUNTS (for VisaoGeral stats)
   ═══════════════════════════════════════════════════════════ */

export async function fetchMyCounts(): Promise<{ docs: number; challenges: number; videos: number; xp: number; streak: number }> {
  const userId = await getUserId()
  const [docs, challenges, videos, streak] = await Promise.all([
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_streaks').select('total_xp, current_streak').eq('user_id', userId).maybeSingle(),
  ])
  return {
    docs: docs.count ?? 0,
    challenges: challenges.count ?? 0,
    videos: videos.count ?? 0,
    xp: streak.data?.total_xp ?? 0,
    streak: streak.data?.current_streak ?? 0,
  }
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY LOG
   ═══════════════════════════════════════════════════════════ */

export interface Activity {
  id: string
  action: string
  title: string
  icon: string
  color: string
  createdAt: number
}

export async function logActivity(action: string, title: string, icon: string, color: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('activity_log')
    .insert({ user_id: userId, action, title, icon, color })

  if (error) throw error
}

export async function fetchRecentActivities(limit = 8): Promise<Activity[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(row => ({
    id: row.id as string,
    action: row.action as string,
    title: row.title as string,
    icon: row.icon as string,
    color: row.color as string,
    createdAt: new Date(row.created_at as string).getTime(),
  }))
}

/* ═══════════════════════════════════════════════════════════
   XP & LEVEL SYSTEM
   ═══════════════════════════════════════════════════════════ */

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1600, 2400, 3500, 5000, 7000, 10000, 14000, 19000, 25000, 32000, 40000, 50000, 62000, 76000, 92000]

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getLevelProgress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = getLevel(xp)
  const current = LEVEL_THRESHOLDS[level - 1] || 0
  const needed = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 20000
  const percent = Math.min(100, ((xp - current) / (needed - current)) * 100)
  return { level, current, needed, percent }
}

export function getRank(xp: number): { title: string; tier: number; color: string } {
  if (xp >= 10000) return { title: 'Lenda', tier: 6, color: '#ff6b6b' }
  if (xp >= 5000) return { title: 'Mestre', tier: 5, color: '#daa03c' }
  if (xp >= 2000) return { title: 'Erudito', tier: 4, color: '#b450b4' }
  if (xp >= 800) return { title: 'Estudioso', tier: 3, color: '#508cc8' }
  if (xp >= 200) return { title: 'Aprendiz', tier: 2, color: '#50b478' }
  return { title: 'Iniciante', tier: 1, color: '#6a5a4a' }
}

export const XP_REWARDS = {
  CREATE_DOC: 50,
  WATCH_VIDEO_PER_MIN: 2,
  COMPLETE_CHALLENGE: 100,
  DAILY_LOGIN: 10,
  CREATE_NOTE: 5,
  COMPLETE_SIMULADO: 200,
}

export async function awardXp(amount: number): Promise<{ newXp: number; leveledUp: boolean }> {
  const streak = await fetchStreak()
  const oldLevel = getLevel(streak.totalXp)
  const newXp = streak.totalXp + amount
  const newLevel = getLevel(newXp)
  streak.totalXp = newXp
  await upsertStreak(streak)
  if (newLevel > oldLevel) {
    pushNotification({
      type: 'level_up',
      title: 'Subiu de nível!',
      message: `Você agora é nível ${newLevel}! (+${amount} XP)`,
    })
  }
  return { newXp, leveledUp: newLevel > oldLevel }
}

/* ═══════════════════════════════════════════════════════════
   ACHIEVEMENTS
   ═══════════════════════════════════════════════════════════ */

export interface UserAchievement {
  achievementId: string
  unlockedAt: number
}

export async function fetchUserAchievements(): Promise<UserAchievement[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  if (error) throw error
  return (data || []).map(row => ({
    achievementId: row.achievement_id as string,
    unlockedAt: new Date(row.unlocked_at as string).getTime(),
  }))
}

export async function unlockAchievement(achievementId: string): Promise<boolean> {
  const userId = await getUserId()
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .maybeSingle()

  if (existing) return false

  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: achievementId })

  if (error) throw error

  const achievement = ACHIEVEMENT_MAP.get(achievementId)
  if (achievement) {
    pushNotification({
      type: 'achievement',
      title: 'Conquista desbloqueada!',
      message: `${achievement.icon} ${achievement.name} — ${achievement.description}`,
      icon: achievement.icon,
    })
  }

  return true
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)).padStart(2, '0')}`
}

export async function incrementStreakField(field: string, amount = 1): Promise<void> {
  const streak = await fetchStreak()
  const key = field as keyof UserStreak

  if (field === 'loginDays') {
    const today = new Date().toISOString().split('T')[0]
    if (streak.lastLoginDate === today) return
    streak.lastLoginDate = today
  }

  if (field === 'videosWatched') {
    const today = new Date().toISOString().split('T')[0]
    if (streak.videosWatchedDate !== today) {
      streak.videosWatchedToday = 0
      streak.videosWatchedDate = today
    }
    streak.videosWatchedToday += amount
  }

  if (field === 'simuladosCompleted') {
    const week = getISOWeek(new Date())
    if (streak.lastSimuladoWeek !== week) {
      streak.simuladosThisWeek = 0
      streak.lastSimuladoWeek = week
    }
    streak.simuladosThisWeek += amount
  }

  const current = (streak[key] as number) || 0
  ;(streak as unknown as Record<string, unknown>)[key] = current + amount
  await upsertStreak(streak)
}

export async function checkAndUnlockAchievements(): Promise<string[]> {
  const streak = await fetchStreak()
  const newlyUnlocked: string[] = []
  const ALL_SUBJECTS = ['Física', 'Química', 'Biologia', 'Matemática', 'Linguagens', 'Ciências Humanas', 'Ciências da Natureza', 'Geografia', 'História', 'Filosofia']
  const ALL_ENEM_YEARS = [2019, 2020, 2021, 2022, 2023]

  const checks: Array<{ id: string; condition: boolean }> = [
    { id: 'primeiro_passo', condition: streak.loginDays >= 1 },
    { id: 'foco_de_aco', condition: streak.currentStreak >= 7 },
    { id: 'o_cinefilo', condition: streak.videosWatched >= 50 },
    { id: 'polimata', condition: ALL_SUBJECTS.every(s => streak.watchedSubjects.includes(s)) },
    { id: 'escriba_digital', condition: streak.notesCreated >= 10 },
    { id: 'sessao_pipoca', condition: streak.videosWatchedToday >= 5 },
    { id: 'arquivista', condition: streak.docsCreated >= 1 },
    { id: 'biblioteca_alexandria', condition: streak.docsCreated >= 20 },
    { id: 'maratonista_enem', condition: streak.simuladosCompleted >= 1 },
    { id: 'viajante_tempo', condition: ALL_ENEM_YEARS.every(y => streak.completedSimuladoYears.includes(y)) },
    { id: 'precisao_cirurgica', condition: streak.bestSimuladoScore >= 80 },
    { id: 'resistencia_ferro', condition: streak.simuladosThisWeek >= 2 },
    { id: 'aceitando_desafio', condition: streak.challengesCompleted >= 1 },
  ]

  for (const check of checks) {
    if (check.condition) {
      const wasNew = await unlockAchievement(check.id)
      if (wasNew) newlyUnlocked.push(check.id)
    }
  }

  // mestre_cerimonias: challenge played by 10+ distinct users
  const myChallengeIds = (await supabase.from('challenges').select('id').eq('user_id', await getUserId())).data?.map(c => c.id as string) || []
  if (myChallengeIds.length > 0) {
    const { data: playerRows } = await supabase
      .from('challenge_attempts')
      .select('user_id')
      .in('challenge_id', myChallengeIds)
      .neq('user_id', await getUserId())
    if (playerRows) {
      const uniqueUsers = new Set(playerRows.map(r => r.user_id as string))
      if (uniqueUsers.size >= 10) {
        const wasNew = await unlockAchievement('mestre_cerimonias')
        if (wasNew) newlyUnlocked.push('mestre_cerimonias')
      }
    }
  }

  return newlyUnlocked
}

export async function checkModeHardcore(challengeId: string, isWin: boolean, modifierCount: number): Promise<void> {
  if (!isWin || modifierCount < 2) return
  const { data } = await supabase.from('challenges').select('difficulty').eq('id', challengeId).single()
  if (data?.difficulty === 'dificil') {
    await unlockAchievement('modo_hardcore')
  }
}

export async function checkMasoquista(challengeId: string, isWin: boolean): Promise<void> {
  if (!isWin) return
  const userId = await getUserId()
  const { data: attempts } = await supabase
    .from('challenge_attempts')
    .select('id, wrong_count')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(3)

  if (!attempts || attempts.length < 3) return

  // The 3 most recent attempts BEFORE the current win must all be losses
  const allLosses = attempts.every(a => a.wrong_count > 0)
  if (allLosses) {
    await unlockAchievement('masoquista')
  }
}

export async function recordAction(type: 'doc' | 'video' | 'challenge' | 'note' | 'simulado' | 'login', meta?: { watchMinutes?: number; subject?: string; simuladoYear?: number; simuladoScore?: number; docPages?: number; challengeWin?: boolean }): Promise<void> {
  const fieldMap: Record<string, string> = {
    doc: 'docsCreated',
    video: 'videosWatched',
    challenge: 'challengesCompleted',
    note: 'notesCreated',
    simulado: 'simuladosCompleted',
    login: 'loginDays',
  }

  const streak = await fetchStreak()

  const field = fieldMap[type]
  if (field) {
    const key = field as keyof UserStreak
    const current = (streak[key] as number) || 0
    ;(streak as unknown as Record<string, unknown>)[key] = current + 1
  }

  if (type === 'video' && meta?.watchMinutes) {
    streak.totalWatchSeconds += meta.watchMinutes * 60
  }

  if (type === 'video' && meta?.subject) {
    if (!streak.watchedSubjects.includes(meta.subject)) {
      streak.watchedSubjects = [...streak.watchedSubjects, meta.subject]
    }
  }

  if (type === 'challenge' && meta?.challengeWin !== undefined) {
    const isWin = meta.challengeWin
    streak.currentStreak = isWin ? streak.currentStreak + 1 : 0
    if (isWin) {
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak)
    }
    streak.lastChallengeDate = new Date().toISOString().split('T')[0]
  }

  if (type === 'simulado' && meta?.simuladoYear) {
    if (!streak.completedSimuladoYears.includes(meta.simuladoYear)) {
      streak.completedSimuladoYears = [...streak.completedSimuladoYears, meta.simuladoYear]
    }
    if (meta.simuladoScore && meta.simuladoScore > streak.bestSimuladoScore) {
      streak.bestSimuladoScore = meta.simuladoScore
    }
  }

  await upsertStreak(streak)

  const xpMap: Record<string, number> = {
    doc: XP_REWARDS.CREATE_DOC,
    video: XP_REWARDS.WATCH_VIDEO_PER_MIN * (meta?.watchMinutes || 1),
    challenge: XP_REWARDS.COMPLETE_CHALLENGE,
    note: XP_REWARDS.CREATE_NOTE,
    simulado: XP_REWARDS.COMPLETE_SIMULADO,
    login: XP_REWARDS.DAILY_LOGIN,
  }
  const xp = xpMap[type]
  if (xp) await awardXp(xp)

  await checkAndUnlockAchievements()
}

export async function checkMaterialOuro(docContent: unknown[]): Promise<void> {
  if (!docContent || docContent.length === 0) return
  let totalChars = 0
  for (const block of docContent) {
    const b = block as Record<string, unknown>
    const contentArr = b.content as Array<Record<string, unknown>> | undefined
    if (contentArr) {
      for (const inline of contentArr) {
        totalChars += ((inline.text as string) || '').length
      }
    }
  }
  if (totalChars >= 30000) {
    await unlockAchievement('material_ouro')
  }
}

/* ═══════════════════════════════════════════════════════════
   ADMIN FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

export interface AdminUserProfile {
  userId: string
  name: string
  email: string
  isAdmin: boolean
  createdAt: string
}

export async function checkIsAdmin(): Promise<boolean> {
  const userId = await getUserId()
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle()
  return data?.is_admin === true
}

export async function adminListUsers(): Promise<AdminUserProfile[]> {
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    userId: row.user_id as string,
    name: row.user_name as string || '',
    email: row.user_email as string || '',
    isAdmin: row.is_admin as boolean,
    createdAt: row.created_at as string,
  }))
}

export async function adminSetUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_role', { target_user_id: userId, new_role: role })
  if (error) throw error
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId })
  if (error) throw error
}

export async function adminGetStats(): Promise<{ totalUsers: number; totalDocs: number; totalChallenges: number; totalVideos: number }> {
  const { data, error } = await supabase.rpc('admin_stats')
  if (error) throw error
  const row = data?.[0] as Record<string, unknown> | undefined
  return {
    totalUsers: Number(row?.total_users || 0),
    totalDocs: Number(row?.total_docs || 0),
    totalChallenges: Number(row?.total_challenges || 0),
    totalVideos: Number(row?.total_videos || 0),
  }
}

/* ═══════════════════════════════════════════════════════════
   ADMIN TOOLS
   ═══════════════════════════════════════════════════════════ */

export interface AdminFullUser {
  userId: string
  name: string
  email: string
  isAdmin: boolean
  createdAt: string
  totalXp: number
  currentStreak: number
  docsCreated: number
  videosWatched: number
  challengesCompleted: number
  simuladosCompleted: number
  notesCreated: number
  loginDays: number
}

export async function adminListUsersFull(): Promise<AdminFullUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users_full')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    userId: row.user_id as string,
    name: row.user_name as string || '',
    email: row.user_email as string || '',
    isAdmin: row.is_admin as boolean,
    createdAt: row.created_at as string,
    totalXp: Number(row.total_xp || 0),
    currentStreak: Number(row.current_streak || 0),
    docsCreated: Number(row.docs_created || 0),
    videosWatched: Number(row.videos_watched || 0),
    challengesCompleted: Number(row.challenges_completed || 0),
    simuladosCompleted: Number(row.simulados_completed || 0),
    notesCreated: Number(row.notes_created || 0),
    loginDays: Number(row.login_days || 0),
  }))
}

export async function adminSetUserXP(userId: string, xp: number): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_xp', { target_user_id: userId, new_xp: xp })
  if (error) throw error
}

export async function adminUnlockAchievementForUser(userId: string, achievementId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_unlock_achievement', { target_user_id: userId, achievement: achievementId })
  if (error) throw error
}

export async function adminRemoveAchievementForUser(userId: string, achievementId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_achievement', { target_user_id: userId, achievement: achievementId })
  if (error) throw error
}

export async function adminGetUserAchievements(userId: string): Promise<{ achievementId: string; unlockedAt: number }[]> {
  const { data, error } = await supabase.rpc('admin_get_user_achievements', { target_user_id: userId })
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    achievementId: row.achievement_id as string,
    unlockedAt: new Date(row.unlocked_at as string).getTime(),
  }))
}

export async function adminDeleteUserDocuments(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_delete_user_documents', { target_user_id: userId })
  if (error) throw error
  return Number(data || 0)
}

export async function adminDeleteUserVideos(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_delete_user_videos', { target_user_id: userId })
  if (error) throw error
  return Number(data || 0)
}

export async function adminDeleteUserNotes(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_delete_user_notes', { target_user_id: userId })
  if (error) throw error
  return Number(data || 0)
}

export async function adminDeleteUserChallenges(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_delete_user_challenges', { target_user_id: userId })
  if (error) throw error
  return Number(data || 0)
}

export async function adminResetUserStreak(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_user_streak', { target_user_id: userId })
  if (error) throw error
}

export async function adminPurgeUserData(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_purge_user_data', { target_user_id: userId })
  if (error) throw error
}
