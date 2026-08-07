import { supabase } from './supabase'
import { pushNotification } from '../components/NotificationProvider'
import { ACHIEVEMENT_MAP } from '../data/achievements'
import type { ChallengeQuestion, Challenge, ChallengeAttempt, UserStreak, ChallengeModifier } from '../types/challenge'
import type { DocMeta, Subject } from '../types/doc'
import { NA_SUBJECT } from '../types/doc'
import type { VideoMeta, VideoNote, MasteryStage } from '../types/video'
import type { Flashcard, FlashcardGroup } from '../types/flashcard'

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
      notesCreated: 0,
      loginDays: 0,
      lastLoginDate: null,
      videosWatchedToday: 0,
      videosWatchedDate: null,
      watchedSubjects: [],
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
    notesCreated: data.notes_created || 0,
    loginDays: data.login_days || 0,
    lastLoginDate: data.last_login_date || null,
    videosWatchedToday: data.videos_watched_today || 0,
    videosWatchedDate: data.videos_watched_date || null,
    watchedSubjects: data.watched_subjects || [],
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
      notes_created: s.notesCreated,
      login_days: s.loginDays,
      last_login_date: s.lastLoginDate,
      videos_watched_today: s.videosWatchedToday,
      videos_watched_date: s.videosWatchedDate,
      watched_subjects: s.watchedSubjects,
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
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('file_name, file_url')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError

  if (doc?.file_url) {
    const fileExt = doc.file_name?.split('.').pop() || 'pdf'
    const filePath = `${id}.${fileExt}`
    const { error: storageError } = await supabase.storage.from('documents').remove([filePath])
    if (storageError) console.error('Erro ao deletar arquivo do storage:', storageError)
  }

  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

function rowToDoc(row: Record<string, unknown>): DocMeta {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    type: row.doc_type as 'editor' | 'pdf',
    subject: (row.subject as Subject) || undefined,
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

export async function updateVideo(v: VideoMeta): Promise<VideoMeta> {
  const { error } = await supabase
    .from('videos')
    .update({
      title: v.title,
      description: v.description || null,
      subject: v.subject,
      video_url: v.videoUrl,
      thumbnail: v.thumbnail || null,
      duration: v.duration || null,
      is_public: v.isPublic,
      updated_at: new Date(v.updatedAt).toISOString(),
    })
    .eq('id', v.id)

  if (error) throw error
  return v
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', id)
  if (error) throw error
}

export async function reassignSubjectToNA(subject: string): Promise<void> {
  const userId = await getUserId()
  const docRes = await supabase
    .from('documents')
    .update({ subject: NA_SUBJECT })
    .eq('user_id', userId)
    .eq('subject', subject)
  if (docRes.error) throw docRes.error
  const vidRes = await supabase
    .from('videos')
    .update({ subject: NA_SUBJECT })
    .eq('user_id', userId)
    .eq('subject', subject)
  if (vidRes.error) throw vidRes.error
}

export async function updateVideoDuration(id: string, duration: string): Promise<void> {
  const { error } = await supabase.from('videos').update({ duration }).eq('id', id)
  if (error) throw error
}

function rowToVideo(row: Record<string, unknown>): VideoMeta {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || undefined,
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
  parentId?: string | null
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
    parentId: row.parent_id as string | null ?? null,
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
      parent_id: group.parentId ?? null,
    })
  if (error) throw error
  return group
}

export async function updateNoteGroup(id: string, patch: { name?: string; sortOrder?: number; parentId?: string | null }): Promise<void> {
  const userId = await getUserId()
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder
  if (patch.parentId !== undefined) update.parent_id = patch.parentId
  const { error } = await supabase
    .from('note_groups')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteNoteGroup(id: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.rpc('delete_group_promote_children', { group_id: id })
  if (error) {
    const { error: delErr } = await supabase.from('note_groups').delete().eq('id', id).eq('user_id', userId)
    if (delErr) throw delErr
  }
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
   VIDEO PROGRESS
   ═══════════════════════════════════════════════════════════ */

export async function fetchVideoProgress(videoId: string): Promise<number> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('video_progress')
    .select('seconds')
    .eq('video_id', videoId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.seconds ?? 0
}

export async function fetchAllVideoProgress(): Promise<Map<string, number>> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('video_progress')
    .select('video_id, seconds')
    .eq('user_id', userId)
  if (error) throw error
  const map = new Map<string, number>()
  for (const row of data || []) {
    map.set(row.video_id as string, row.seconds as number)
  }
  return map
}

export async function upsertVideoProgress(videoId: string, seconds: number): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('video_progress')
    .upsert({ user_id: userId, video_id: videoId, seconds, updated_at: new Date().toISOString() }, { onConflict: 'user_id,video_id' })
  if (error) throw error
}

/* ═══════════════════════════════════════════════════════════
   GOALS
   ═══════════════════════════════════════════════════════════ */

export interface Goal {
  id: string
  text: string
  done: boolean
  color?: string
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
    color: (row.color as string) || undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : null,
  }))
}

export async function createGoal(text: string, color?: string): Promise<Goal> {
  const userId = await getUserId()
  const id = uid()
  const now = new Date().toISOString()
  const insertData: Record<string, unknown> = { id, user_id: userId, text, done: false, created_at: now }
  if (color) insertData.color = color
  const { error } = await supabase
    .from('goals')
    .insert(insertData)

  if (error) throw error
  return { id, text, done: false, color, createdAt: Date.now(), completedAt: null }
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

const LEVEL_THRESHOLDS = [
  0, 150, 400, 800, 1400, 2200, 3300, 4800, 6800, 9500,
  13000, 17500, 23000, 30000, 39000, 50000, 64000, 82000, 105000, 135000,
  175000, 225000, 290000, 375000, 485000, 625000, 805000, 1035000, 1330000, 1700000,
]

const RANK_TABLE: { title: string; tier: number; color: string }[] = [
  { title: 'Iniciante',     tier: 1, color: '#6a5a4a' },
  { title: 'Aprendiz',      tier: 2, color: '#50b478' },
  { title: 'Estudioso',     tier: 3, color: '#508cc8' },
  { title: 'Erudito',       tier: 4, color: '#b450b4' },
  { title: 'Mestre',        tier: 5, color: '#daa03c' },
  { title: 'Lenda',         tier: 6, color: '#ff6b6b' },
  { title: 'Transcendido',  tier: 7, color: '#ff4444' },
  { title: 'Imortal',       tier: 8, color: '#e0e0ff' },
  { title: 'Absoluto',      tier: 9, color: '#ffd700' },
  { title: 'Infinito',      tier: 10, color: '#ffffff' },
]

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getLevelProgress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = getLevel(xp)
  const current = LEVEL_THRESHOLDS[level - 1] || 0
  const needed = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 500000
  const percent = Math.min(100, ((xp - current) / (needed - current)) * 100)
  return { level, current, needed, percent }
}

export function getRank(xp: number): { title: string; tier: number; color: string } {
  const level = getLevel(xp)
  const rankIndex = Math.min(Math.floor((level - 1) / 2), RANK_TABLE.length - 1)
  return RANK_TABLE[rankIndex]
}

export const XP_REWARDS = {
  CREATE_DOC: 50,
  WATCH_VIDEO_PER_MIN: 2,
  COMPLETE_CHALLENGE: 100,
  DAILY_LOGIN: 10,
  CREATE_NOTE: 5,
  MASTERY_TEST: 50,
}

export async function awardXp(amount: number): Promise<{ newXp: number; leveledUp: boolean }> {
  const streak = await fetchStreak()
  const oldLevel = getLevel(streak.totalXp)
  const newXp = streak.totalXp + amount
  const newLevel = getLevel(newXp)
  streak.totalXp = newXp
  await upsertStreak(streak)
  pushNotification({
    type: 'xp_gain',
    title: `+${amount} XP`,
    message: 'XP ganho!',
    xpAmount: amount,
  })
  if (newLevel > oldLevel) {
    pushNotification({
      type: 'level_up',
      title: 'Subiu de nível!',
      message: `Você agora é nível ${newLevel}!`,
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

export async function checkAndUnlockAchievements(): Promise<string[]> {
  const streak = await fetchStreak()
  const newlyUnlocked: string[] = []
  const ALL_SUBJECTS = ['Física', 'Química', 'Biologia', 'Matemática', 'Linguagens', 'Geografia', 'História', 'Filosofia']

  const checks: Array<{ id: string; condition: boolean }> = [
    { id: 'primeiro_passo', condition: streak.loginDays >= 1 },
    { id: 'foco_de_aco', condition: streak.currentStreak >= 7 },
    { id: 'o_cinefilo', condition: streak.videosWatched >= 50 },
    { id: 'polimata', condition: ALL_SUBJECTS.every(s => streak.watchedSubjects.includes(s)) },
    { id: 'escriba_digital', condition: streak.notesCreated >= 10 },
    { id: 'sessao_pipoca', condition: streak.videosWatchedToday >= 5 },
    { id: 'arquivista', condition: streak.docsCreated >= 1 },
    { id: 'biblioteca_alexandria', condition: streak.docsCreated >= 20 },
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

export async function checkMasoquista(challengeId: string, isWin: boolean, currentAttemptId: string): Promise<void> {
  if (!isWin) return
  const userId = await getUserId()
  const { data: attempts } = await supabase
    .from('challenge_attempts')
    .select('id, wrong_count')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .neq('id', currentAttemptId)
    .order('completed_at', { ascending: false })
    .limit(3)

  if (!attempts || attempts.length < 3) return

  const allLosses = attempts.every(a => a.wrong_count > 0)
  if (allLosses) {
    await unlockAchievement('masoquista')
  }
}

export async function recordAction(type: 'doc' | 'video' | 'challenge' | 'note' | 'login' | 'mastery', meta?: { watchMinutes?: number; subject?: string; docPages?: number; challengeWin?: boolean; challengeXp?: number }): Promise<void> {
  const fieldMap: Record<string, string> = {
    doc: 'docsCreated',
    video: 'videosWatched',
    challenge: 'challengesCompleted',
    note: 'notesCreated',
    login: 'loginDays',
  }

  const streak = await fetchStreak()
  const today = new Date().toISOString().split('T')[0]

  if (type === 'login' && streak.lastLoginDate === today) {
    return
  }

  const field = fieldMap[type]
  if (field) {
    const key = field as keyof UserStreak
    const current = (streak[key] as number) || 0
    ;(streak as unknown as Record<string, unknown>)[key] = current + 1
  }

  if (type === 'login') {
    streak.lastLoginDate = today
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

  await upsertStreak(streak)

  const xpMap: Record<string, number> = {
    doc: XP_REWARDS.CREATE_DOC,
    video: XP_REWARDS.WATCH_VIDEO_PER_MIN * (meta?.watchMinutes || 1),
    challenge: meta?.challengeXp ?? XP_REWARDS.COMPLETE_CHALLENGE,
    note: XP_REWARDS.CREATE_NOTE,
    login: XP_REWARDS.DAILY_LOGIN,
    mastery: XP_REWARDS.MASTERY_TEST,
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
   MASTERY TEST (AI)
   ═══════════════════════════════════════════════════════════ */

export async function callMasteryTest(payload: {
  notes: string[]
  videoTitle: string
  videoDescription: string
  stage: MasteryStage
  userAnswer?: string
  questions?: Array<{ id: string; question: string; options?: string[]; correctIndex?: number }>
}): Promise<Record<string, unknown>> {
  const res = await fetch('/api/mastery-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/* ═══════════════════════════════════════════════════════════
   FLASH CARDS
   ═══════════════════════════════════════════════════════════ */

function rowToFlashcard(row: Record<string, unknown>): Flashcard {
  return {
    id: row.id as string,
    front: row.front as string,
    back: row.back as string,
    subject: row.subject as Subject,
    known: (row.known as boolean) ?? false,
    groupId: (row.group_id as string) || undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

function rowToFlashcardGroup(row: Record<string, unknown>): FlashcardGroup {
  return {
    id: row.id as string,
    name: row.name as string,
    subject: row.subject as Subject,
    description: (row.description as string) || undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

function flashcardToRow(card: Flashcard, userId: string): Record<string, unknown> {
  return {
    id: card.id,
    user_id: userId,
    front: card.front,
    back: card.back,
    subject: card.subject,
    known: card.known,
  }
}

export async function fetchFlashcards(): Promise<Flashcard[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(rowToFlashcard)
}

export async function createFlashcard(card: Omit<Flashcard, 'id' | 'known' | 'createdAt' | 'updatedAt'>): Promise<Flashcard> {
  const userId = await getUserId()
  const newCard: Flashcard = {
    id: uid(),
    front: card.front,
    back: card.back,
    subject: card.subject,
    known: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const { error } = await supabase.from('flashcards').insert(flashcardToRow(newCard, userId))
  if (error) throw error
  return newCard
}

export async function updateFlashcard(id: string, patch: Partial<Omit<Flashcard, 'id' | 'createdAt'>>): Promise<void> {
  const userId = await getUserId()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.front !== undefined) row.front = patch.front
  if (patch.back !== undefined) row.back = patch.back
  if (patch.subject !== undefined) row.subject = patch.subject
  if (patch.known !== undefined) row.known = patch.known

  const { error } = await supabase.from('flashcards').update(row).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function deleteFlashcard(id: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('flashcards').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

/* ═══════════════════════════════════════════════════════════
   FLASH CARD GROUPS
   ═══════════════════════════════════════════════════════════ */

export async function fetchFlashcardGroups(): Promise<FlashcardGroup[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('flashcard_groups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(rowToFlashcardGroup)
}

export interface FlashcardGroupInput {
  name: string
  subject: Subject
  description?: string
  cards: Array<{ id?: string; front: string; back: string; subject: Subject }>
}

export async function createFlashcardGroup(input: FlashcardGroupInput): Promise<FlashcardGroup> {
  const userId = await getUserId()
  const groupId = uid()

  const { error: groupError } = await supabase
    .from('flashcard_groups')
    .insert({ id: groupId, user_id: userId, name: input.name, subject: input.subject, description: input.description || null })
  if (groupError) throw groupError

  if (input.cards.length > 0) {
    const rows = input.cards.map(c => ({
      id: uid(),
      user_id: userId,
      front: c.front,
      back: c.back,
      subject: c.subject,
      group_id: groupId,
    }))
    const { error: cardsError } = await supabase.from('flashcards').insert(rows)
    if (cardsError) throw cardsError
  }

  return {
    id: groupId,
    name: input.name,
    subject: input.subject,
    description: input.description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export async function updateFlashcardGroup(groupId: string, input: FlashcardGroupInput): Promise<void> {
  const userId = await getUserId()

  const { error: metaError } = await supabase
    .from('flashcard_groups')
    .update({ name: input.name, subject: input.subject, description: input.description || null, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('user_id', userId)
  if (metaError) throw metaError

  const keptIds: string[] = []

  for (const c of input.cards) {
    if (c.id) {
      keptIds.push(c.id)
      const { error } = await supabase
        .from('flashcards')
        .update({ front: c.front, back: c.back, subject: c.subject, updated_at: new Date().toISOString() })
        .eq('id', c.id)
        .eq('user_id', userId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('flashcards')
        .insert({ id: uid(), user_id: userId, front: c.front, back: c.back, subject: c.subject, group_id: groupId })
      if (error) throw error
    }
  }

  const { data: currentCards, error: fetchError } = await supabase
    .from('flashcards')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
  if (fetchError) throw fetchError

  const toDelete = (currentCards || [])
    .map(r => r.id as string)
    .filter(id => !keptIds.includes(id))
  if (toDelete.length > 0) {
    const { error: delError } = await supabase.from('flashcards').delete().in('id', toDelete).eq('user_id', userId)
    if (delError) throw delError
  }
}

export async function deleteFlashcardGroup(groupId: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('flashcard_groups').delete().eq('id', groupId).eq('user_id', userId)
  if (error) throw error
}
