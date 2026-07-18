/* ============================================================
   SUPABASE SERVICE - ENEM STUDY
   Camada de comunicação com Supabase
   ============================================================ */

const SupabaseService = (() => {
  const SUPABASE_URL = 'https://pymtagngzrzupbvbarrl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_zapw9ov_DxM2BnJU5wG58A_Y8eVZphO';

  let client = null;

  function getClient() {
    if (client) return client;
    if (typeof window.supabase === 'undefined') {
      console.error('Supabase JS library not loaded');
      return null;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
  }

  // ---- Auth ----
  async function signUp(email, password, metadata = {}) {
    const supabase = getClient();
    if (!supabase) return OfflineService.signUpOffline(email, password, metadata);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (err) {
      console.warn('Supabase offline, falling back to local:', err.message);
      return OfflineService.signUpOffline(email, password, metadata);
    }
  }

  async function signIn(email, password) {
    const supabase = getClient();
    if (!supabase) return OfflineService.signInOffline(email, password);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      SessionManager.saveSession(data.session);
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      console.warn('Supabase offline, falling back to local:', err.message);
      return OfflineService.signInOffline(email, password);
    }
  }

  async function signOut() {
    const supabase = getClient();
    if (supabase) {
      try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    }
    SessionManager.clearSession();
    OfflineService.clearOfflineSession();
  }

  async function getSession() {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          SessionManager.saveSession(session);
          return session;
        }
      } catch (e) { /* fall through */ }
    }
    return SessionManager.getSavedSession();
  }

  async function getUser() {
    const session = await getSession();
    return session?.user || null;
  }

  // ---- Profile ----
  async function getProfile(userId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        OfflineService.cacheData('profile', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('profile');
  }

  async function updateProfile(userId, updates) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();
        if (error) throw error;
        OfflineService.cacheData('profile', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    OfflineService.queueOfflineAction({ type: 'UPDATE_PROFILE', userId, updates });
    return null;
  }

  // ---- Avatars ----
  async function getAvatars() {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('avatars')
          .select('*')
          .eq('active', true)
          .order('sort_order');
        if (error) throw error;
        OfflineService.cacheData('avatars', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('avatars') || [];
  }

  // ---- Journey ----
  async function getJourneyNodes() {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('journey_nodes')
          .select('*')
          .eq('active', true)
          .order('node_order');
        if (error) throw error;
        OfflineService.cacheData('journey_nodes', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('journey_nodes') || [];
  }

  async function getUserJourneyProgress(userId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('user_journey_progress')
          .select('*')
          .eq('user_id', userId);
        if (error) throw error;
        OfflineService.cacheData('journey_progress', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('journey_progress') || [];
  }

  // ---- Videos ----
  async function getVideos(nodeId) {
    const supabase = getClient();
    if (supabase) {
      try {
        let query = supabase.from('videos').select('*');
        if (nodeId) query = query.eq('node_id', nodeId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  async function getVideoProgress(userId, videoId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('user_video_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .single();
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData(`video_progress_${videoId}`) || null;
  }

  async function saveVideoProgress(userId, videoId, progress) {
    const supabase = getClient();
    const payload = {
      user_id: userId,
      video_id: videoId,
      current_time_seconds: progress.currentTime,
      total_watched_seconds: progress.totalWatched,
      completed: progress.completed || false,
      last_watched_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data } = await supabase
          .from('user_video_progress')
          .upsert(payload, { onConflict: 'user_id,video_id' })
          .select()
          .single();
        return data;
      } catch (e) { /* fall through */ }
    }
    OfflineService.cacheData(`video_progress_${videoId}`, payload);
    return payload;
  }

  // ---- Notes ----
  async function getVideoNotes(userId, videoId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('video_notes')
          .select('*')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .order('timestamp_seconds');
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData(`notes_${videoId}`) || [];
  }

  async function saveNote(userId, videoId, note) {
    const supabase = getClient();
    const payload = {
      user_id: userId,
      video_id: videoId,
      timestamp_seconds: note.timestamp,
      content: note.content,
      content_html: note.html || ''
    };

    if (supabase) {
      try {
        const { data } = await supabase
          .from('video_notes')
          .insert(payload)
          .select()
          .single();
        return data;
      } catch (e) { /* fall through */ }
    }
    OfflineService.queueOfflineAction({ type: 'SAVE_NOTE', payload });
    return { ...payload, id: crypto.randomUUID() };
  }

  async function deleteNote(noteId) {
    const supabase = getClient();
    if (supabase) {
      try {
        await supabase.from('video_notes').delete().eq('id', noteId);
        return true;
      } catch (e) { /* fall through */ }
    }
    OfflineService.queueOfflineAction({ type: 'DELETE_NOTE', noteId });
    return true;
  }

  // ---- Challenges ----
  async function getChallenges(filters = {}) {
    const supabase = getClient();
    if (supabase) {
      try {
        let query = supabase.from('challenges').select('*').eq('active', true);
        if (filters.subject) query = query.eq('subject', filters.subject);
        if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
        if (filters.nodeId) query = query.eq('node_id', filters.nodeId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  async function submitChallengeResult(userId, challengeId, answer, timeSpent) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('submit_challenge_answer', {
          p_user_id: userId,
          p_challenge_id: challengeId,
          p_user_answer: answer,
          p_time_spent: timeSpent
        });
        if (error) throw error;
        return data;
      } catch (e) { /* fall through */ }
    }
    OfflineService.queueOfflineAction({
      type: 'SUBMIT_CHALLENGE',
      userId, challengeId, answer, timeSpent
    });
    return { is_correct: false, xp_earned: 0 };
  }

  async function getReviewChallenges(userId, limit = 10) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase.rpc('get_review_challenges', {
          p_user_id: userId,
          p_limit: limit
        });
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  // ---- Stats ----
  async function getUserStats(userId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (data) OfflineService.cacheData('user_stats', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('user_stats') || null;
  }

  // ---- Dungeons ----
  async function getDungeons() {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('dungeons')
          .select('*')
          .eq('active', true);
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  async function getDungeonRooms(dungeonId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('dungeon_rooms')
          .select('*, challenges(*)')
          .eq('dungeon_id', dungeonId)
          .order('room_number');
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  async function createDungeonSession(userId, dungeonId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('user_dungeon_sessions')
          .insert({ user_id: userId, dungeon_id: dungeonId })
          .select()
          .single();
        return data;
      } catch (e) { /* fall through */ }
    }
    return null;
  }

  async function updateDungeonSession(sessionId, updates) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('user_dungeon_sessions')
          .update(updates)
          .eq('id', sessionId)
          .select()
          .single();
        return data;
      } catch (e) { /* fall through */ }
    }
    return null;
  }

  // ---- Notifications ----
  async function getNotifications(userId) {
    const supabase = getClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  // ---- Streak ----
  async function updateStreak(userId) {
    const supabase = getClient();
    if (supabase) {
      try {
        await supabase.rpc('update_daily_streak', { p_user_id: userId });
      } catch (e) { /* fall through */ }
    }
  }

  // ---- Study Time ----
  async function recordStudyTime(userId, type, seconds) {
    const supabase = getClient();
    if (supabase) {
      try {
        await supabase.rpc('record_study_time', {
          p_user_id: userId,
          p_type: type,
          p_seconds: seconds
        });
      } catch (e) { /* fall through */ }
    }
  }

  return {
    signUp, signIn, signOut, getSession, getUser,
    getProfile, updateProfile, getAvatars,
    getJourneyNodes, getUserJourneyProgress,
    getVideos, getVideoProgress, saveVideoProgress,
    getVideoNotes, saveNote, deleteNote,
    getChallenges, submitChallengeResult, getReviewChallenges,
    getUserStats, getDungeons, getDungeonRooms,
    createDungeonSession, updateDungeonSession,
    getNotifications, updateStreak, recordStudyTime
  };
})();
