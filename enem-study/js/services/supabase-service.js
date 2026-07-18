/* ============================================================
   SUPABASE SERVICE - ENEM STUDY
   ============================================================ */

const SupabaseService = (() => {
  const SUPABASE_URL = 'https://pymtagngzrzupbvbarrl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bXRhZ25nenJ6dXBidmJhcnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMzQyOTAsImV4cCI6MjA5OTgxMDI5MH0.BZECOEeTP8Aepjn0sWpSyVr_v-YVJYhdmHb9wrWLkgY';

  let _client = null;

  function getClient() {
    if (_client) return _client;
    if (typeof window.supabase === 'undefined') {
      console.error('[Supabase] Biblioteca JS nao carregada. Verifique a conexao.');
      return null;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[Supabase] URL ou chave anon nao configurada.');
      return null;
    }
    if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
      console.error('[Supabase] A chave anon nao parece ser uma JWT valida.');
      console.error('[Supabase] Chave atual:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
      console.error('[Supabase] A chave deve comecar com "eyJ" (formato JWT). Va em Supabase > Settings > API e copie a "anon public" key.');
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _client;
  }

  // ---- Auth ----
  async function signUp(email, password, metadata = {}) {
    const sb = getClient();
    if (!sb) return { success: false, error: 'Biblioteca Supabase nao disponivel. Verifique sua conexao.' };

    try {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: metadata }
      });

      if (error) {
        console.error('[Supabase] signUp error:', JSON.stringify(error));
        const msg = error.message || error.error_description || error.msg || 'Erro desconhecido';
        return { success: false, error: traduzirErro(msg) };
      }

      if (data.session) {
        SessionManager.saveSession(data.session);
        return { success: true, user: data.user, session: data.session };
      }

      if (data.user && !data.session) {
        if (data.user.identities && data.user.identities.length === 0) {
          return { success: false, error: 'Este email ja esta cadastrado.' };
        }
        return { success: true, user: data.user, session: null, needsConfirmation: true };
      }

      return { success: false, error: 'Resposta inesperada do servidor.' };
    } catch (err) {
      console.error('[Supabase] signUp exception:', err);
      if (err.message && err.message.includes('Failed to fetch')) {
        return { success: false, error: 'Falha na conexao. Verifique sua internet e a URL do Supabase.' };
      }
      return { success: false, error: 'Erro ao criar conta: ' + (err.message || 'desconhecido') };
    }
  }

  async function signIn(email, password) {
    const sb = getClient();
    if (!sb) return { success: false, error: 'Biblioteca Supabase nao disponivel. Verifique sua conexao.' };

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[Supabase] signIn error:', JSON.stringify(error));
        const msg = error.message || error.error_description || error.msg || 'Erro desconhecido';
        return { success: false, error: traduzirErro(msg) };
      }
      SessionManager.saveSession(data.session);
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      console.error('[Supabase] signIn exception:', err);
      if (err.message && err.message.includes('Failed to fetch')) {
        return { success: false, error: 'Falha na conexao. Verifique sua internet e a URL do Supabase.' };
      }
      return { success: false, error: 'Erro ao entrar: ' + (err.message || 'desconhecido') };
    }
  }

  function traduzirErro(msg) {
    if (!msg) return 'Erro desconhecido.';
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
    if (msg.includes('User already registered')) return 'Este email ja esta cadastrado.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('Unable to validate email address')) return 'Email invalido.';
    if (msg.includes('Email not confirmed')) return 'Email nao confirmado. Verifique sua caixa de entrada.';
    if (msg.includes('Invalid API key')) return 'Chave de API invalida. Verifique a configuracao do Supabase.';
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
    return msg;
  }

  async function signOut() {
    const sb = getClient();
    if (sb) { try { await sb.auth.signOut(); } catch (e) { /* ignore */ } }
    SessionManager.clearSession();
    OfflineService.clearOfflineSession();
  }

  async function getSession() {
    const sb = getClient();
    if (sb) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) { SessionManager.saveSession(session); return session; }
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
    const sb = getClient();
    if (sb) {
      try {
        const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
        if (error) throw error;
        OfflineService.cacheData('profile', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('profile');
  }

  async function updateProfile(userId, updates) {
    const sb = getClient();
    if (sb) {
      try {
        const { data, error } = await sb.from('profiles').update(updates).eq('id', userId).select().single();
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
    const sb = getClient();
    if (sb) {
      try {
        const { data, error } = await sb.from('avatars').select('*').eq('active', true).order('sort_order');
        if (error) throw error;
        OfflineService.cacheData('avatars', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('avatars') || [];
  }

  // ---- Journey ----
  async function getJourneyNodes() {
    const sb = getClient();
    if (sb) {
      try {
        const { data, error } = await sb.from('journey_nodes').select('*').eq('active', true).order('node_order');
        if (error) throw error;
        OfflineService.cacheData('journey_nodes', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('journey_nodes') || [];
  }

  async function getUserJourneyProgress(userId) {
    const sb = getClient();
    if (sb) {
      try {
        const { data, error } = await sb.from('user_journey_progress').select('*').eq('user_id', userId);
        if (error) throw error;
        OfflineService.cacheData('journey_progress', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('journey_progress') || [];
  }

  // ---- Videos ----
  async function getVideos(nodeId) {
    const sb = getClient();
    if (sb) {
      try {
        let query = sb.from('videos').select('*');
        if (nodeId) query = query.eq('node_id', nodeId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  async function getVideoProgress(userId, videoId) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('user_video_progress').select('*').eq('user_id', userId).eq('video_id', videoId).single();
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData(`video_progress_${videoId}`) || null;
  }

  async function saveVideoProgress(userId, videoId, progress) {
    const sb = getClient();
    const payload = {
      user_id: userId, video_id: videoId,
      current_time_seconds: progress.currentTime,
      total_watched_seconds: progress.totalWatched,
      completed: progress.completed || false,
      last_watched_at: new Date().toISOString()
    };
    if (sb) {
      try {
        const { data } = await sb.from('user_video_progress').upsert(payload, { onConflict: 'user_id,video_id' }).select().single();
        return data;
      } catch (e) { /* fall through */ }
    }
    OfflineService.cacheData(`video_progress_${videoId}`, payload);
    return payload;
  }

  // ---- Notes ----
  async function getVideoNotes(userId, videoId) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('video_notes').select('*').eq('user_id', userId).eq('video_id', videoId).order('timestamp_seconds');
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData(`notes_${videoId}`) || [];
  }

  async function saveNote(userId, videoId, note) {
    const sb = getClient();
    const payload = {
      user_id: userId, video_id: videoId,
      timestamp_seconds: note.timestamp,
      content: note.content,
      content_html: note.html || ''
    };
    if (sb) {
      try {
        const { data } = await sb.from('video_notes').insert(payload).select().single();
        return data;
      } catch (e) { /* fall through */ }
    }
    OfflineService.queueOfflineAction({ type: 'SAVE_NOTE', payload });
    return { ...payload, id: crypto.randomUUID() };
  }

  async function deleteNote(noteId) {
    const sb = getClient();
    if (sb) {
      try {
        await sb.from('video_notes').delete().eq('id', noteId);
        return true;
      } catch (e) { /* fall through */ }
    }
    OfflineService.queueOfflineAction({ type: 'DELETE_NOTE', noteId });
    return true;
  }

  // ---- Challenges ----
  async function getChallenges(filters = {}) {
    const sb = getClient();
    if (sb) {
      try {
        let query = sb.from('challenges').select('*').eq('active', true);
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
    const sb = getClient();
    if (sb) {
      try {
        const { data, error } = await sb.rpc('submit_challenge_answer', {
          p_user_id: userId, p_challenge_id: challengeId,
          p_user_answer: answer, p_time_spent: timeSpent
        });
        if (error) throw error;
        return data;
      } catch (e) { /* fall through */ }
    }
    OfflineService.queueOfflineAction({ type: 'SUBMIT_CHALLENGE', userId, challengeId, answer, timeSpent });
    return { is_correct: false, xp_earned: 0 };
  }

  async function getReviewChallenges(userId, limit = 10) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.rpc('get_review_challenges', { p_user_id: userId, p_limit: limit });
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  // ---- Stats ----
  async function getUserStats(userId) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('user_stats').select('*').eq('user_id', userId).single();
        if (data) OfflineService.cacheData('user_stats', data);
        return data;
      } catch (e) { /* fall through */ }
    }
    return OfflineService.getCachedData('user_stats') || null;
  }

  // ---- Dungeons ----
  async function getDungeons() {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('dungeons').select('*').eq('active', true);
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  async function getDungeonRooms(dungeonId) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('dungeon_rooms').select('*, challenges(*)').eq('dungeon_id', dungeonId).order('room_number');
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  async function createDungeonSession(userId, dungeonId) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('user_dungeon_sessions').insert({ user_id: userId, dungeon_id: dungeonId }).select().single();
        return data;
      } catch (e) { /* fall through */ }
    }
    return null;
  }

  async function updateDungeonSession(sessionId, updates) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('user_dungeon_sessions').update(updates).eq('id', sessionId).select().single();
        return data;
      } catch (e) { /* fall through */ }
    }
    return null;
  }

  // ---- Notifications ----
  async function getNotifications(userId) {
    const sb = getClient();
    if (sb) {
      try {
        const { data } = await sb.from('user_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
        return data || [];
      } catch (e) { /* fall through */ }
    }
    return [];
  }

  // ---- Profile Fallback (se trigger falhar) ----
  async function ensureProfile(userId, metadata = {}) {
    const sb = getClient();
    if (!sb) return false;
    try {
      const { data: existing } = await sb.from('profiles').select('id').eq('id', userId).maybeSingle();
      if (existing) return true;

      const { error: insertErr } = await sb.from('profiles').insert({
        id: userId,
        adventurer_name: metadata.adventurer_name || 'Aventureiro',
        avatar_url: metadata.avatar_url || '/assets/avatars/default.svg',
        hero_class: metadata.hero_class || 'guerreiro'
      });
      if (insertErr) {
        console.warn('[Supabase] ensureProfile insert error:', insertErr.message);
        return false;
      }

      await sb.from('user_stats').insert({ user_id: userId });
      return true;
    } catch (e) {
      console.warn('[Supabase] ensureProfile exception:', e.message);
      return false;
    }
  }

  // ---- Streak ----
  async function updateStreak(userId) {
    const sb = getClient();
    if (sb) { try { await sb.rpc('update_daily_streak', { p_user_id: userId }); } catch (e) { /* ignore */ } }
  }

  // ---- Study Time ----
  async function recordStudyTime(userId, type, seconds) {
    const sb = getClient();
    if (sb) {
      try { await sb.rpc('record_study_time', { p_user_id: userId, p_type: type, p_seconds: seconds }); } catch (e) { /* ignore */ }
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
    getNotifications, updateStreak, recordStudyTime, ensureProfile
  };
})();
