import { supabase } from './supabase'
import type { ChallengeQuestion, Challenge, ChallengeAttempt, UserStreak } from '../types/challenge'
import type { DocMeta, Subject } from '../types/doc'
import type { VideoMeta, VideoNote } from '../types/video'

/* ── Helpers ──────────────────────────────────────────── */

function uid(): string {
  return crypto.randomUUID()
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  return user.id
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
    content: q.content || null,
    image_url: q.imageUrl || null,
    explanation: q.explanation || null,
    options: q.options,
    statements: q.statements,
    match_pairs: q.matchPairs,
    order_items: q.orderItems,
    blanks: q.blanks,
    open_expected_text: q.openExpectedText || null,
    crossword_clues: q.crosswordClues,
    crossword_size: q.crosswordSize,
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
    content: (row.content as string) || undefined,
    imageUrl: (row.image_url as string) || undefined,
    explanation: (row.explanation as string) || undefined,
    options: (row.options as ChallengeQuestion['options']) || [],
    statements: (row.statements as ChallengeQuestion['statements']) || [],
    matchPairs: (row.match_pairs as ChallengeQuestion['matchPairs']) || [],
    orderItems: (row.order_items as ChallengeQuestion['orderItems']) || [],
    blanks: (row.blanks as ChallengeQuestion['blanks']) || [],
    openExpectedText: (row.open_expected_text as string) || undefined,
    crosswordClues: (row.crossword_clues as ChallengeQuestion['crosswordClues']) || [],
    crosswordSize: (row.crossword_size as number) || 5,
  }
}

function questionToRow(q: ChallengeQuestion, userId: string): Record<string, unknown> {
  return {
    id: q.id,
    user_id: userId,
    type: q.type,
    title: q.title,
    subject: q.subject,
    content: q.content || null,
    image_url: q.imageUrl || null,
    explanation: q.explanation || null,
    options: q.options,
    statements: q.statements,
    match_pairs: q.matchPairs,
    order_items: q.orderItems,
    blanks: q.blanks,
    open_expected_text: q.openExpectedText || null,
    crossword_clues: q.crosswordClues,
    crossword_size: q.crosswordSize,
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
  const { error } = await supabase
    .from('challenge_attempts')
    .insert({
      id: uid(),
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
  return a
}

function rowToAttempt(row: Record<string, unknown>): ChallengeAttempt {
  return {
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
    }
  }

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastChallengeDate: data.last_challenge_date,
    totalXp: data.total_xp,
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
      timestamp: note.timestamp,
    })

  if (error) throw error
  return note
}

export async function deleteVideoNote(id: string): Promise<void> {
  const { error } = await supabase.from('video_notes').delete().eq('id', id)
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
