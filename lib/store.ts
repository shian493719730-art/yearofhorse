import { create } from 'zustand';
import { supabase } from './supabase';

// --- 1. 必须导出的工具函数 ---

// 获取今日日期字符串
export const getTodayKey = () => new Date().toISOString().split('T')[0];

// 计算项目已持续天数
export const getDaysActive = (startDate: string) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 获取今日的打卡记录
export const getTodayLog = (goal: any) => {
  if (!goal || !goal.logs) return null;
  const today = getTodayKey();
  const todayLogs = goal.logs.filter((l: any) => l.date === today);
  return todayLogs.length > 0 ? todayLogs[todayLogs.length - 1] : null;
};

// 获取当前阶段
export const getCurrentPhase = (startDate: string) => {
  const days = getDaysActive(startDate);
  if (days <= 3) return 1;
  if (days <= 10) return 2;
  return 3;
};

// --- 2. 内部核心算法 ---

// 🎯 每日任务量强制波动 (5的倍数)
const getDailyBreathBase = (base: number, date: string) => {
  if (!base) return 4;
  const seed = date.split('-').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const drift = (seed % 21 - 10) / 100; // ±10% 波动
  const raw = base * (1 + drift);
  
  if (raw < 10) return Math.round(raw * 2) / 2;
  return Math.round(raw / 5) * 5;
};

const safeNum = (val: any) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

// --- 3. Store 定义 ---

export const useGoalStore = create<any>((set, get) => ({
  activeGoal: null,
  isLoading: false,

  fetchLatestGoal: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('goals')
      .select('*, daily_logs(*)')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      const today = getTodayKey();
      const dailyBase = getDailyBreathBase(data.base_task_value || 4, today);

      const uniqueMap = new Map();
      const rawLogs = data.daily_logs || [];
      
      rawLogs.sort((a: any, b: any) => a.id - b.id);
      rawLogs.forEach((log: any) => uniqueMap.set(log.date, log));
      
      const cleanLogs = Array.from(uniqueMap.values()).map((log: any) => ({
        ...log,
        energyLevel: safeNum(log.energy),
        actualDone: safeNum(log.actual_done || log.actualDone),
        note: String(log.ai_feedback || log.note || "")
      })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      set({
        activeGoal: {
          id: data.id,
          title: data.title,
          totalDays: data.total_days || 0,
          unitName: data.unit_name || '小时',
          baseTaskValue: data.base_task_value || 4,
          dailyBase, 
          aiLogicState: data.ai_logic_state || { pending: false },
          startDate: data.start_date,
          logs: cleanLogs
        }
      });
    }
    set({ isLoading: false });
  },

  // 🛠️ 修复点：补回 updateGoal 函数
  updateGoal: async (title: string, totalDays: number) => {
    const { activeGoal } = get();
    if (!activeGoal) return false;

    // 更新数据库
    const { error } = await supabase
      .from('goals')
      .update({ title, total_days: totalDays })
      .eq('id', activeGoal.id);

    if (error) {
      console.error("Update failed:", error);
      return false;
    }

    // 更新本地状态
    set((state: any) => ({
      activeGoal: {
        ...state.activeGoal,
        title,
        totalDays
      }
    }));

    return true;
  },

  addDailyLog: async (log: any) => {
    const { activeGoal } = get();
    if (!activeGoal) return false;

    const dbLog = {
      goal_id: activeGoal.id,
      date: log.date || getTodayKey(),
      energy: safeNum(log.energyLevel),
      actual_done: String(log.actualDone),
      ai_feedback: String(log.note || "")
    };

    const { error } = await supabase.from('daily_logs').insert([dbLog]);
    
    if (error) {
      console.error("Save failed:", error);
      return false;
    }

    const newLocalLog = { 
      ...log, 
      date: dbLog.date, 
      energyLevel: dbLog.energy, 
      actualDone: safeNum(dbLog.actual_done), 
      note: dbLog.ai_feedback 
    };

    const otherLogs = (activeGoal.logs || []).filter((l: any) => l.date !== dbLog.date);
    set((state: any) => ({ 
      activeGoal: { ...state.activeGoal, logs: [...otherLogs, newLocalLog] } 
    }));
    
    return true;
  }
}));