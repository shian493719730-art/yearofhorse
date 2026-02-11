"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DailyLog = {
  date: string;
  phase: "morning" | "afternoon" | "evening" | "completed";
  energyLevel: number;
  baseTarget: number;
  actualDone: number;
};

export type DayPhase = DailyLog["phase"];

export type Goal = {
  id: string;
  title: string;
  daysRequired: number;
  startDate: string;
  history: DailyLog[];
  status: "active" | "completed" | "abandoned";
};

type CreateGoalInput = {
  title: string;
  daysRequired: number;
  startDate?: string;
};

type DailyLogInput = Omit<DailyLog, "date"> & {
  date?: string;
};

type GoalStore = {
  activeGoal: Goal | null;
  archivedGoals: Goal[];
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  createGoal: (input: CreateGoalInput) => { ok: boolean; reason?: string };
  addDailyLog: (input: DailyLogInput) => void;
  completeActiveGoal: () => void;
  abandonActiveGoal: () => void;
  clearStore: () => void;
};

const STORE_KEY = "yearofhorse-store";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const getTodayKey = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const phaseOrder: Record<DayPhase, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
  completed: 3
};

export const getTodayLog = (goal: Goal | null, date = getTodayKey()) => {
  if (!goal) {
    return null;
  }

  const logs = goal.history.filter((log) => log.date === date);
  if (logs.length === 0) {
    return null;
  }

  return logs.sort((a, b) => phaseOrder[a.phase] - phaseOrder[b.phase]).at(-1) ?? null;
};

export const getCurrentPhase = (goal: Goal | null): DayPhase => {
  const todayLog = getTodayLog(goal);
  if (!todayLog) {
    return "morning";
  }

  if (todayLog.phase === "morning") {
    return "afternoon";
  }

  if (todayLog.phase === "afternoon") {
    return "evening";
  }

  return "completed";
};

export const calculateProgress = (
  energyLevel: number,
  actualDone: number,
  baseTarget: number
) => {
  const safeEnergy = clamp(energyLevel, 0, 100);
  const safeDone = Math.max(0, actualDone);
  const safeBaseTarget = Math.max(0.0001, baseTarget);

  const adjustedTarget = safeBaseTarget * (safeEnergy / 100 + 0.5);
  const percentage = (safeDone / adjustedTarget) * 100;

  return Number(percentage.toFixed(2));
};

export const calculateGoalCompletion = (goal: Goal) => {
  if (goal.daysRequired <= 0) {
    return 0;
  }

  const dayCredits = goal.history.reduce((sum, log) => {
    const dailyProgress = calculateProgress(
      log.energyLevel,
      log.actualDone,
      log.baseTarget
    );

    return sum + clamp(dailyProgress, 0, 100) / 100;
  }, 0);

  const completion = (dayCredits / goal.daysRequired) * 100;
  return Number(clamp(completion, 0, 100).toFixed(2));
};

const upsertDailyLog = (history: DailyLog[], incoming: DailyLog) => {
  const nextHistory = [...history];
  const index = nextHistory.findIndex((item) => item.date === incoming.date);

  if (index >= 0) {
    nextHistory[index] = incoming;
  } else {
    nextHistory.push(incoming);
  }

  return nextHistory.sort((a, b) => a.date.localeCompare(b.date));
};

const createId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `goal-${Date.now()}-${Math.floor(Math.random() * 100000)}`);

const moveToArchive = (
  current: Goal | null,
  status: "completed" | "abandoned",
  archivedGoals: Goal[]
) => {
  if (!current) {
    return { activeGoal: null, archivedGoals };
  }

  return {
    activeGoal: null,
    archivedGoals: [{ ...current, status }, ...archivedGoals]
  };
};

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      activeGoal: null,
      archivedGoals: [],
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      createGoal: ({ title, daysRequired, startDate }) => {
        const trimmedTitle = title.trim();
        const safeDaysRequired = Math.max(1, Math.floor(daysRequired));

        if (!trimmedTitle) {
          return { ok: false, reason: "Goal title cannot be empty." };
        }

        if (get().activeGoal) {
          return {
            ok: false,
            reason: "There is already an active goal. Complete or abandon it first."
          };
        }

        const goal: Goal = {
          id: createId(),
          title: trimmedTitle,
          daysRequired: safeDaysRequired,
          startDate: startDate ?? getTodayKey(),
          history: [],
          status: "active"
        };

        set({ activeGoal: goal });
        return { ok: true };
      },
      addDailyLog: (input) => {
        const currentGoal = get().activeGoal;
        if (!currentGoal) {
          return;
        }

        const log: DailyLog = {
          date: input.date ?? getTodayKey(),
          phase: input.phase,
          energyLevel: clamp(input.energyLevel, 0, 100),
          baseTarget: Math.max(0, input.baseTarget),
          actualDone: Math.max(0, input.actualDone)
        };

        const updatedGoal: Goal = {
          ...currentGoal,
          history: upsertDailyLog(currentGoal.history, log)
        };

        const completion = calculateGoalCompletion(updatedGoal);
        if (completion >= 100) {
          const next = moveToArchive(
            updatedGoal,
            "completed",
            get().archivedGoals
          );
          set(next);
          return;
        }

        set({ activeGoal: updatedGoal });
      },
      completeActiveGoal: () => {
        const { activeGoal, archivedGoals } = get();
        set(moveToArchive(activeGoal, "completed", archivedGoals));
      },
      abandonActiveGoal: () => {
        const { activeGoal, archivedGoals } = get();
        set(moveToArchive(activeGoal, "abandoned", archivedGoals));
      },
      clearStore: () => {
        set({
          activeGoal: null,
          archivedGoals: []
        });
      }
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeGoal: state.activeGoal,
        archivedGoals: state.archivedGoals
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
