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

const safeNum = (val: any) => { const n = Number(val); return isNaN(n) ? 0 : n; };

export const useGoalStore = create<any>((set: any, get: any) => ({
  activeGoal: null,
  isLoading: false,
  isRefetching: false,
  weeklyReport: null,
  dailyReport: null,

  fetchLatestGoal: async (silent = false) => {
    if (silent) set({ isRefetching: true });
    else set({ isLoading: true });
    try {
      const { data, error } = await supabase.from('goals').select('*, daily_logs(*)').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data && !error) {
        const today = getTodayKey();
        const cleanLogs = (data.daily_logs || []).map((log: any) => ({
          ...log,
          energyLevel: safeNum(log.energy),
          actualDone: safeNum(log.actual_done),
          note: String(log.ai_feedback || "")
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        set({ activeGoal: { ...data, dailyBase: data.base_task_value, unitName: data.unit_name, logs: cleanLogs, startDate: data.start_date, totalDays: data.total_days } });
      } else if (!data) {
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
    try {
      await supabase.from('goals').update({ is_active: false }).eq('is_active', true);
      const { error } = await supabase.from('goals').insert([{
        title, total_days: totalDays, unit_name: unit, base_task_value: base,
        start_date: new Date().toISOString(), is_active: true
      }]);
      if (error) return { ok: false };
      await get().fetchLatestGoal();
      return { ok: true };
    } catch (e) { return { ok: false }; }
  },

  updateGoal: async (title: string, totalDays: number) => {
    const { activeGoal } = get();
    if (!activeGoal) return false;
    const { error } = await supabase.from('goals').update({ title, total_days: totalDays }).eq('id', activeGoal.id);
    if (error) return false;
    await get().fetchLatestGoal(true);
    return true;
  },

  addDailyLog: async (log: any) => {
    const { activeGoal } = get();
    if (!activeGoal) return false;
    const { error } = await supabase.from('daily_logs').insert([{
      goal_id: activeGoal.id, date: log.date || getTodayKey(),
      phase: log.phase, energy: safeNum(log.energyLevel), actual_done: String(log.actualDone), ai_feedback: String(log.note || "")
    }]);
    if (error) return false;
    await get().fetchLatestGoal(true);
    return true;
  }
}));