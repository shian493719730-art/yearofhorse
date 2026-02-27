import { create } from 'zustand';
import { supabase } from './supabase';

const SESSION_STORAGE_KEY = 'philosopher_session';
const LEGACY_HANDLE_STORAGE_KEY = 'philosopher_handle';
const HANDLE_SEPARATOR = '::';

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const normalizeHandle = (value: string) => value.trim();
const normalizePin = (value: string) => value.trim();

type SessionPayload = {
  key: string;
  label: string;
};

export const normalizeDateKey = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Date) return formatLocalDate(value);

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const localeMatch = raw.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (localeMatch) return `${localeMatch[1]}-${pad2(Number(localeMatch[2]))}-${pad2(Number(localeMatch[3]))}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return formatLocalDate(parsed);

  return raw;
};

const compareLogs = (a: any, b: any) => {
  const dateDiff = normalizeDateKey(a.date).localeCompare(normalizeDateKey(b.date));
  if (dateDiff !== 0) return dateDiff;
  return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
};

const persistSession = (session: SessionPayload) => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem(LEGACY_HANDLE_STORAGE_KEY, session.label);
};

const readSession = (): SessionPayload | null => {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.key && parsed?.label) return parsed;
  } catch (error) {}

  return null;
};

const digestPin = async (handle: string, pin: string) => {
  const payload = new TextEncoder().encode(`${normalizeHandle(handle)}:${normalizePin(pin)}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', payload);
  return Array.from(new Uint8Array(hashBuffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
};

const buildSecureHandle = async (handle: string, pin: string) => {
  const normalizedHandle = normalizeHandle(handle);
  const pinDigest = await digestPin(normalizedHandle, pin);
  return `${normalizedHandle}${HANDLE_SEPARATOR}${pinDigest}`;
};

const migrateLegacyHandle = async (legacyHandle: string, secureHandle: string) => {
  const { error: profileError } = await supabase.from('profiles').update({ handle: secureHandle }).eq('handle', legacyHandle);
  if (profileError) return false;

  const [{ error: goalsError }, { error: logsError }] = await Promise.all([
    supabase.from('goals').update({ user_handle: secureHandle }).eq('user_handle', legacyHandle),
    supabase.from('daily_logs').update({ user_handle: secureHandle }).eq('user_handle', legacyHandle)
  ]);

  if (!goalsError && !logsError) return true;

  await Promise.all([
    supabase.from('profiles').update({ handle: legacyHandle }).eq('handle', secureHandle),
    supabase.from('goals').update({ user_handle: legacyHandle }).eq('user_handle', secureHandle),
    supabase.from('daily_logs').update({ user_handle: legacyHandle }).eq('user_handle', secureHandle)
  ]);

  return false;
};

export const getTodayKey = () => formatLocalDate(new Date());

export const getDaysActive = (startDate: string) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

export const getTodayLog = (goal: any) => {
  if (!goal || !goal.logs) return null;
  const today = getTodayKey();
  return [...goal.logs].filter((log: any) => normalizeDateKey(log.date) === today).sort(compareLogs).at(-1) || null;
};

export const getCurrentPhase = (startDate: string) => {
  const days = getDaysActive(startDate);
  if (days <= 3) return "适应期";
  if (days <= 10) return "稳定期";
  return "深水区";
};

const safeNum = (val: any) => { const n = Number(val); return isNaN(n) ? 0 : n; };

export const useGoalStore = create<any>((set: any, get: any) => ({
  activeGoal: null,
  currentUser: null, // 新增：当前用户的代号
  currentUserKey: null,
  savedHandleHint: "",
  isLoading: false,
  isRefetching: false,
  weeklyReport: null,
  dailyReport: null,

  // 1. 初始化用户：从浏览器缓存读取代号
  initUser: () => {
    const session = readSession();
    if (session) {
      set({ currentUser: session.label, currentUserKey: session.key, savedHandleHint: session.label });
      get().fetchLatestGoal();
      return;
    }

    const legacyHandle = localStorage.getItem(LEGACY_HANDLE_STORAGE_KEY);
    if (legacyHandle) {
      set({ savedHandleHint: normalizeHandle(legacyHandle) });
    }
  },

  // 2. 登录/注册逻辑：申领代号
  login: async (handle: string, pin: string) => {
    const normalizedHandle = normalizeHandle(handle);
    const normalizedPin = normalizePin(pin);
    if (!normalizedHandle || !normalizedPin) return { ok: false, message: "请输入代号和口令" };
    if (normalizedHandle.includes(HANDLE_SEPARATOR)) return { ok: false, message: "代号中不能包含连续冒号" };
    if (normalizedPin.length < 4) return { ok: false, message: "口令至少 4 位" };

    try {
      const secureHandle = await buildSecureHandle(normalizedHandle, normalizedPin);
      const { data: profile, error: profileError } = await supabase.from('profiles').select('handle').eq('handle', secureHandle).maybeSingle();
      if (profileError) return { ok: false, message: "身份校验失败，请稍后再试" };

      if (profile) {
        persistSession({ key: secureHandle, label: normalizedHandle });
        set({ currentUser: normalizedHandle, currentUserKey: secureHandle, savedHandleHint: normalizedHandle });
        await get().fetchLatestGoal();
        return { ok: true };
      }

      const { data: legacyProfile, error: legacyError } = await supabase.from('profiles').select('handle').eq('handle', normalizedHandle).maybeSingle();
      if (legacyError) return { ok: false, message: "身份校验失败，请稍后再试" };

      if (legacyProfile) {
        const migrated = await migrateLegacyHandle(normalizedHandle, secureHandle);
        if (!migrated) return { ok: false, message: "旧身份升级失败，请稍后重试" };

        persistSession({ key: secureHandle, label: normalizedHandle });
        set({ currentUser: normalizedHandle, currentUserKey: secureHandle, savedHandleHint: normalizedHandle });
        await get().fetchLatestGoal();
        return { ok: true };
      }

      const prefix = `${normalizedHandle}${HANDLE_SEPARATOR}`;
      const { data: claimedProfiles, error: claimError } = await supabase.from('profiles')
        .select('handle')
        .gte('handle', prefix)
        .lt('handle', `${prefix}\uffff`)
        .limit(1);

      if (claimError) return { ok: false, message: "身份校验失败，请稍后再试" };
      if (claimedProfiles?.length) return { ok: false, message: "口令不正确" };

      const { error: regError } = await supabase.from('profiles').insert([{ handle: secureHandle }]);
      if (regError) return { ok: false, message: "代号注册失败，可能已被占用" };

      persistSession({ key: secureHandle, label: normalizedHandle });
      set({ currentUser: normalizedHandle, currentUserKey: secureHandle, savedHandleHint: normalizedHandle });
      await get().fetchLatestGoal();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: "身份校验失败，请稍后再试" };
    }
  },

  fetchLatestGoal: async (silent = false) => {
    const { currentUserKey } = get();
    if (!currentUserKey) return; // 没登录不查数据

    if (silent) set({ isRefetching: true });
    else set({ isLoading: true });
    
    try {
      // ✨ 关键点：增加 .eq('user_handle', currentUser) 过滤，只看自己的目标
      const { data, error } = await supabase.from('goals')
        .select('*, daily_logs(*)')
        .eq('user_handle', currentUserKey)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();

      if (data && !error) {
        const cleanLogs = (data.daily_logs || []).map((log: any) => ({
          ...log,
          date: normalizeDateKey(log.date),
          energyLevel: safeNum(log.energy),
          actualDone: safeNum(log.actual_done),
          note: String(log.ai_feedback || "")
        })).sort(compareLogs);
        
        set({ activeGoal: { ...data, dailyBase: data.base_task_value, unitName: data.unit_name, logs: cleanLogs, startDate: data.start_date, totalDays: data.total_days } });
      } else {
        set({ activeGoal: null });
      }
    } catch (e) {}
    set({ isLoading: false, isRefetching: false });
  },

  aiAnalyzeGoal: async (title: string) => {
    await new Promise(r => setTimeout(r, 1500));
    return [
      { id: 'time', label: '沉浸', unit: '小时', base: 4, desc: '侧重专注深度的积累' },
      { id: 'output', label: '量化', unit: title.includes('学') ? '页' : '组', base: title.includes('学') ? 20 : 10, desc: '侧重具体结果的交付' },
      { id: 'burst', label: '爆发', unit: '次', base: 5, desc: '侧重间歇性高能投入' }
    ];
  },

  createGoal: async (title: string, totalDays: number, unit: string, base: number) => {
    const { currentUserKey } = get();
    if (!currentUserKey) return { ok: false };

    try {
      // ✨ 关键点：只把属于当前用户的旧目标设为不活跃
      await supabase.from('goals').update({ is_active: false }).eq('user_handle', currentUserKey).eq('is_active', true);
      
      const { error } = await supabase.from('goals').insert([{
        title, total_days: totalDays, unit_name: unit, base_task_value: base,
        start_date: new Date().toISOString(), is_active: true,
        user_handle: currentUserKey // 注入身份
      }]);
      
      if (error) return { ok: false };
      await get().fetchLatestGoal();
      return { ok: true };
    } catch (e) { return { ok: false }; }
  },

  updateGoal: async (title: string, totalDays: number) => {
    const { activeGoal, currentUserKey } = get();
    if (!activeGoal || !currentUserKey) return false;
    // 增加 user_handle 校验
    const { error } = await supabase.from('goals').update({ title, total_days: totalDays }).eq('id', activeGoal.id).eq('user_handle', currentUserKey);
    if (error) return false;
    await get().fetchLatestGoal(true);
    return true;
  },

  addDailyLog: async (log: any) => {
    const { activeGoal, currentUserKey } = get();
    if (!activeGoal || !currentUserKey) return false;

    const entryDate = normalizeDateKey(log.date || getTodayKey());
    const existingLog = [...(activeGoal.logs || [])]
      .filter((item: any) => normalizeDateKey(item.date) === entryDate)
      .sort(compareLogs)
      .at(-1);

    const payload = {
      goal_id: activeGoal.id,
      user_handle: currentUserKey,
      date: entryDate,
      phase: log.phase,
      energy: safeNum(log.energyLevel),
      actual_done: safeNum(log.actualDone),
      ai_feedback: String(log.note || "")
    };

    const { error } = existingLog?.id
      ? await supabase.from('daily_logs').update(payload).eq('id', existingLog.id).eq('user_handle', currentUserKey)
      : await supabase.from('daily_logs').insert([payload]);

    if (error) return false;
    await get().fetchLatestGoal(true);
    return true;
  }
}));
