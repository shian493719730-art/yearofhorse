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

export type DailyRecord = {
  date: string;
  energy: number;
  progress: number;
};

export type DayPhase = DailyLog["phase"];

type GoalStatus = "active" | "completed" | "abandoned";

export type Goal = {
  id: string;
  title: string;
  startDate: string;
  totalDays: number;
  history: DailyLog[];
  status: GoalStatus;
};

type CreateGoalInput = {
  title: string;
  startDate?: string;
  totalDays?: number;
};

type DailyLogInput = Omit<DailyLog, "date"> & {
  date?: string;
};

type GoalStore = {
  activeGoal: Goal | null;
  archivedGoals: Goal[];
  records: DailyRecord[];
  stabilityScore: number;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setGoal: (title: string, days: number) => void;
  addRecord: (energy: number, progress: number) => void;
  createGoal: (
    input: CreateGoalInput | string,
    totalDays?: number
  ) => { ok: boolean; reason?: string };
  addDailyLog: (input: DailyLogInput) => void;
  completeActiveGoal: () => void;
  abandonActiveGoal: () => void;
  clearStore: () => void;
};

const STORE_KEY = "yearofhorse-store";
const STORE_VERSION = 4;
const DEFAULT_TOTAL_DAYS = 21;
const DEFAULT_BASE_TARGET = 4;
const MAX_PROGRESS_HOURS = 6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeTotalDays = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TOTAL_DAYS;
  }

  return Math.max(1, Math.floor(parsed));
};

const normalizeProgress = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return clamp(parsed, 0, 100);
};

export const getTodayKey = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const getDaysActive = (startDate: string, date = getTodayKey()) => {
  const start = new Date(`${startDate}T00:00:00`);
  const current = new Date(`${date}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) {
    return 1;
  }

  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(diffDays, 1);
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
  if (goal.history.length === 0) {
    return 0;
  }

  const totalCompletion = goal.history.reduce((sum, log) => {
    const dailyProgress = calculateProgress(
      log.energyLevel,
      log.actualDone,
      log.baseTarget
    );

    return sum + clamp(dailyProgress, 0, 100);
  }, 0);

  const averageCompletion = totalCompletion / goal.history.length;
  return Number(clamp(averageCompletion, 0, 100).toFixed(2));
};

const toProgressPercent = (log: DailyLog) =>
  clamp(calculateProgress(log.energyLevel, log.actualDone, log.baseTarget), 0, 100);

const toProgressHours = (progress: number) =>
  Number(((clamp(progress, 0, 100) / 100) * MAX_PROGRESS_HOURS).toFixed(2));

const toDailyRecord = (log: DailyLog): DailyRecord => ({
  date: log.date,
  energy: clamp(log.energyLevel, 0, 100),
  progress: Number(toProgressPercent(log).toFixed(2))
});

export const calculateStability = (logs: DailyLog[]) => {
  if (logs.length === 0) {
    return 0;
  }

  const recentLogs = [...logs].slice(-7);
  const latestDate = recentLogs.at(-1)?.date;
  const latestDateMs = latestDate
    ? new Date(`${latestDate}T00:00:00`).getTime()
    : Number.NaN;

  const { scoreWeightedSum, weightSum } = recentLogs.reduce(
    (acc, log) => {
      const logDateMs = new Date(`${log.date}T00:00:00`).getTime();
      const daysFromLatest =
        Number.isNaN(latestDateMs) || Number.isNaN(logDateMs)
          ? Number.POSITIVE_INFINITY
          : Math.floor((latestDateMs - logDateMs) / 86400000);
      const weight = daysFromLatest <= 2 ? 2 : 1;

      const energy = clamp(log.energyLevel, 0, 100);
      const completion = clamp(
        calculateProgress(log.energyLevel, log.actualDone, log.baseTarget),
        0,
        100
      );
      const alignment = 100 - Math.abs(energy - completion);

      // Completion and energy are both important, but mismatch between the two
      // is penalized to surface unstable patterns (high energy + low completion).
      let sampleScore = completion * 0.45 + energy * 0.2 + alignment * 0.35;

      const energyLead = energy - completion;
      const completionLead = completion - energy;
      if (energyLead > 40) {
        sampleScore -= 15;
      }

      if (completionLead > 20) {
        sampleScore += 5;
      }

      return {
        scoreWeightedSum: acc.scoreWeightedSum + sampleScore * weight,
        weightSum: acc.weightSum + weight
      };
    },
    { scoreWeightedSum: 0, weightSum: 0 }
  );

  if (weightSum === 0) {
    return 0;
  }

  const stability = scoreWeightedSum / weightSum;
  return Number(clamp(stability, 0, 100).toFixed(2));
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

const upsertDailyRecord = (records: DailyRecord[], incoming: DailyRecord) => {
  const nextRecords = [...records];
  const index = nextRecords.findIndex((item) => item.date === incoming.date);

  if (index >= 0) {
    nextRecords[index] = incoming;
  } else {
    nextRecords.push(incoming);
  }

  return nextRecords.sort((a, b) => a.date.localeCompare(b.date));
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
    return { activeGoal: null, archivedGoals, stabilityScore: 0 };
  }

  return {
    activeGoal: null,
    archivedGoals: [{ ...current, status }, ...archivedGoals],
    stabilityScore: 0
  };
};

const normalizeLog = (raw: unknown): DailyLog | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const phase = raw.phase;
  if (
    phase !== "morning" &&
    phase !== "afternoon" &&
    phase !== "evening" &&
    phase !== "completed"
  ) {
    return null;
  }

  return {
    date: typeof raw.date === "string" ? raw.date : getTodayKey(),
    phase,
    energyLevel: clamp(Number(raw.energyLevel) || 0, 0, 100),
    baseTarget: Math.max(0, Number(raw.baseTarget) || 0),
    actualDone: Math.max(0, Number(raw.actualDone) || 0)
  };
};

const normalizeRecord = (raw: unknown): DailyRecord | null => {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    date: typeof raw.date === "string" ? raw.date : getTodayKey(),
    energy: clamp(Number(raw.energy) || 0, 0, 100),
    progress: normalizeProgress(raw.progress)
  };
};

const deriveRecordsFromGoal = (goal: Goal | null) => {
  if (!goal) {
    return [];
  }

  return goal.history.reduce<DailyRecord[]>((records, log) => {
    return upsertDailyRecord(records, toDailyRecord(log));
  }, []);
};

const normalizeGoal = (raw: unknown): Goal | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const rawHistory = Array.isArray(raw.history) ? raw.history : [];
  const history = rawHistory
    .map((log) => normalizeLog(log))
    .filter((log): log is DailyLog => log !== null)
    .reduce<DailyLog[]>((acc, log) => upsertDailyLog(acc, log), []);

  const statusValue = raw.status;
  const status: GoalStatus =
    statusValue === "completed" || statusValue === "abandoned" || statusValue === "active"
      ? statusValue
      : "active";

  return {
    id: typeof raw.id === "string" ? raw.id : createId(),
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "Untitled Goal",
    startDate: typeof raw.startDate === "string" ? raw.startDate : getTodayKey(),
    totalDays: normalizeTotalDays(raw.totalDays ?? raw.daysRequired),
    history,
    status
  };
};

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      activeGoal: null,
      archivedGoals: [],
      records: [],
      stabilityScore: 0,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setGoal: (title, days) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          return;
        }

        const nextGoal: Goal = {
          id: createId(),
          title: trimmedTitle,
          startDate: getTodayKey(),
          totalDays: normalizeTotalDays(days),
          history: [],
          status: "active"
        };

        set({
          activeGoal: nextGoal,
          records: [],
          stabilityScore: 0
        });
      },
      addRecord: (energy, progress) => {
        const date = getTodayKey();
        const safeEnergy = clamp(energy, 0, 100);
        const safeProgress = normalizeProgress(progress);
        const nextRecords = upsertDailyRecord(get().records, {
          date,
          energy: safeEnergy,
          progress: Number(safeProgress.toFixed(2))
        });

        const currentGoal = get().activeGoal;
        if (!currentGoal) {
          set({ records: nextRecords });
          return;
        }

        const settlementLog: DailyLog = {
          date,
          phase: "evening",
          energyLevel: safeEnergy,
          baseTarget: DEFAULT_BASE_TARGET,
          actualDone: toProgressHours(safeProgress)
        };

        const updatedGoal: Goal = {
          ...currentGoal,
          history: upsertDailyLog(currentGoal.history, settlementLog)
        };

        set({
          activeGoal: updatedGoal,
          records: nextRecords,
          stabilityScore: calculateStability(updatedGoal.history)
        });
      },
      createGoal: (input, totalDays) => {
        const payload =
          typeof input === "string"
            ? { title: input, totalDays }
            : { ...input, totalDays: input.totalDays ?? totalDays };
        const { title, startDate } = payload;
        const trimmedTitle = title.trim();

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
          startDate: startDate ?? getTodayKey(),
          totalDays: normalizeTotalDays(payload.totalDays),
          history: [],
          status: "active"
        };

        set({ activeGoal: goal, records: [], stabilityScore: 0 });
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

        const nextStability = calculateStability(updatedGoal.history);
        const nextRecords = upsertDailyRecord(get().records, toDailyRecord(log));
        set({ activeGoal: updatedGoal, records: nextRecords, stabilityScore: nextStability });
      },
      completeActiveGoal: () => {
        const { activeGoal, archivedGoals } = get();
        set({ ...moveToArchive(activeGoal, "completed", archivedGoals), records: [] });
      },
      abandonActiveGoal: () => {
        const { activeGoal, archivedGoals } = get();
        set({ ...moveToArchive(activeGoal, "abandoned", archivedGoals), records: [] });
      },
      clearStore: () => {
        set({
          activeGoal: null,
          archivedGoals: [],
          records: [],
          stabilityScore: 0
        });
      }
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = isRecord(persistedState) ? persistedState : {};

        const activeGoal = normalizeGoal(state.activeGoal);
        const archivedGoals = Array.isArray(state.archivedGoals)
          ? state.archivedGoals
              .map((goal) => normalizeGoal(goal))
              .filter((goal): goal is Goal => goal !== null)
          : [];

        const rawStability = Number(state.stabilityScore);
        const stabilityScore = Number.isFinite(rawStability)
          ? clamp(rawStability, 0, 100)
          : calculateStability(activeGoal?.history ?? []);
        const records = Array.isArray(state.records)
          ? state.records
              .map((record) => normalizeRecord(record))
              .filter((record): record is DailyRecord => record !== null)
          : deriveRecordsFromGoal(activeGoal);

        return {
          activeGoal,
          archivedGoals,
          records,
          stabilityScore
        };
      },
      partialize: (state) => ({
        activeGoal: state.activeGoal,
        archivedGoals: state.archivedGoals,
        records: state.records,
        stabilityScore: state.stabilityScore
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
