import { create } from 'zustand';
import { supabase } from './supabase';

export const getTodayKey = () => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

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
  return goal.logs.find((l: any) => l.date === today) || null;
};

export const getCurrentPhase = (startDate: string) => {
  const days = getDaysActive(startDate);
  if (days <= 3) return "适应期";
  if (days <= 10) return "稳定期";
  return "深水区";
};

// 🛠️ 核心映射：解决数据库 phase 字段只收整数的问题
const PHASE_MAP: Record<string, number> = { "适应期": 1, "稳定期": 2, "深水区": 3 };
const REVERSE_PHASE_MAP: Record<number, string> = { 1: "适应期", 2: "稳定期", 3: "深水区" };

const safeNum = (val: any) => { const n = Number(val); return isNaN(n) ? 0 : n; };

export const useGoalStore = create<any>((set: any, get: any) => ({
  activeGoal: null,
  currentUser: null, 
  isLoading: false,
  isRefetching: false,
  weeklyReport: null,
  dailyReport: null,

  initUser: () => {
    const saved = localStorage.getItem('philosopher_handle');
    if (saved) {
      set({ currentUser: saved });
      get().fetchLatestGoal();
    }
  },

  login: async (handle: string) => {
    if (!handle) return;
    const { data: profile } = await supabase.from('profiles').select('handle').eq('handle', handle).maybeSingle();
    if (!profile) {
      const { error: regError } = await supabase.from('profiles').insert([{ handle }]);
      if (regError) {
        alert("代号注册失败，可能已被占用");
        return;
      }
    }
    localStorage.setItem('philosopher_handle', handle);
    set({ currentUser: handle });
    get().fetchLatestGoal();
  },

  fetchLatestGoal: async (silent = false) => {
    const { currentUser } = get();
    if (!currentUser) return;
    if (silent) set({ isRefetching: true });
    else set({ isLoading: true });
    
    try {
      const { data, error } = await supabase.from('goals')
        .select('*, daily_logs(*)')
        .eq('user_handle', currentUser)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();

      if (data && !error) {
        const cleanLogs = (data.daily_logs || []).map((log: any) => ({
          ...log,
          energyLevel: safeNum(log.energy),
          actualDone: safeNum(log.actual_done),
          // 🛠️ 还原：从数据库读数字，映射回文案
          phase: REVERSE_PHASE_MAP[log.phase] || "适应期",
          note: String(log.ai_feedback || "")
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
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
    const { currentUser } = get();
    try {
      await supabase.from('goals').update({ is_active: false }).eq('user_handle', currentUser).eq('is_active', true);
      const { error } = await supabase.from('goals').insert([{
        title, total_days: totalDays, unit_name: unit, base_task_value: base,
        start_date: new Date().toISOString(), is_active: true,
        user_handle: currentUser
      }]);
      if (error) return { ok: false };
      await get().fetchLatestGoal();
      return { ok: true };
    } catch (e) { return { ok: false }; }
  },

  updateGoal: async (title: string, totalDays: number) => {
    const { activeGoal, currentUser } = get();
    if (!activeGoal || !currentUser) return false;
    const { error } = await supabase.from('goals').update({ title, total_days: totalDays }).eq('id', activeGoal.id).eq('user_handle', currentUser);
    if (error) return false;
    await get().fetchLatestGoal(true);
    return true;
  },

  addDailyLog: async (log: any) => {
    const { activeGoal, currentUser } = get();
    if (!activeGoal || !currentUser) return false;

    // 🛠️ 关键修复：发送整数 phase
    const phaseInt = PHASE_MAP[log.phase] || 1;

    const dbPayload = {
      goal_id: activeGoal.id, 
      user_handle: currentUser,
      date: log.date || getTodayKey(),
      phase: phaseInt, 
      energy: safeNum(log.energyLevel), 
      actual_done: safeNum(log.actualDone), 
      ai_feedback: String(log.note || "")
    };

    const { error } = await supabase
      .from('daily_logs')
      .upsert([dbPayload], { onConflict: 'goal_id,user_handle,date' });

    if (error) return false;
    await get().fetchLatestGoal(true);
    return true;
  }
}));