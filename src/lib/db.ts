import { supabase } from './supabase'
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
  return true
}

export async function incrementStreakField(field: string, amount = 1): Promise<void> {
  const streak = await fetchStreak()
  const key = field as keyof UserStreak
  const current = (streak[key] as number) || 0
  ;(streak as unknown as Record<string, number>)[key] = current + amount
  await upsertStreak(streak)
}

export async function checkAndUnlockAchievements(): Promise<string[]> {
  const streak = await fetchStreak()
  const newlyUnlocked: string[] = []

  const checks: Array<{ id: string; condition: boolean }> = [
    { id: 'foco_de_aco', condition: streak.currentStreak >= 7 },
    { id: 'o_cinefilo', condition: streak.videosWatched >= 50 },
    { id: 'escriba_digital', condition: streak.notesCreated >= 10 },
    { id: 'arquivista', condition: streak.docsCreated >= 1 },
    { id: 'biblioteca_alexandria', condition: streak.docsCreated >= 20 },
    { id: 'maratonista_enem', condition: streak.simuladosCompleted >= 1 },
  ]

  for (const check of checks) {
    if (check.condition) {
      const wasNew = await unlockAchievement(check.id)
      if (wasNew) newlyUnlocked.push(check.id)
    }
  }

  return newlyUnlocked
}
