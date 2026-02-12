"use client";

import { useEffect, useMemo, useState } from "react";
import PhaseController from "@/components/PhaseController";
import {
  calculateGoalCompletion,
  getCurrentPhase,
  getDaysActive,
  getTodayKey,
  getTodayLog,
  type DayPhase,
  useGoalStore
} from "@/lib/store";

type ConsoleTheme = "morning" | "afternoon" | "night";

const getThemeFromHour = (hour: number): ConsoleTheme => {
  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }

  return "night";
};

const getLocalTheme = () => getThemeFromHour(new Date().getHours());

const workflowLabels: Record<DayPhase, string> = {
  morning: "Morning Calibration",
  afternoon: "Afternoon Throughput",
  evening: "Evening Consolidation",
  completed: "Cycle Complete"
};

const getStabilityInterpretation = (score: number) => {
  if (score > 80) {
    return "Optimal / Stable";
  }

  if (score >= 50) {
    return "Dynamic / Fluctuating";
  }

  return "Entropy Increasing / Critical";
};

const themeTokens: Record<
  ConsoleTheme,
  {
    label: string;
    page: string;
    text: string;
    panel: string;
    border: string;
    muted: string;
    input: string;
    button: string;
  }
> = {
  morning: {
    label: "Morning",
    page: "bg-slate-50",
    text: "text-slate-900",
    panel: "bg-white/75",
    border: "border-slate-200",
    muted: "text-slate-600",
    input: "bg-white border-slate-300 text-slate-900",
    button: "bg-slate-900 text-white hover:bg-slate-700"
  },
  afternoon: {
    label: "Afternoon",
    page: "bg-slate-200",
    text: "text-slate-900",
    panel: "bg-slate-100/80",
    border: "border-slate-300",
    muted: "text-slate-700",
    input: "bg-white border-slate-400 text-slate-900",
    button: "bg-slate-900 text-white hover:bg-slate-700"
  },
  night: {
    label: "Night",
    page: "bg-slate-950",
    text: "text-slate-100",
    panel: "bg-slate-900/80",
    border: "border-slate-700",
    muted: "text-slate-400",
    input: "bg-slate-950 border-slate-600 text-slate-100",
    button: "bg-slate-100 text-slate-900 hover:bg-slate-300"
  }
};

export default function HomePage() {
  const hasHydrated = useGoalStore((state) => state.hasHydrated);
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const createGoal = useGoalStore((state) => state.createGoal);
  const addDailyLog = useGoalStore((state) => state.addDailyLog);
  const clearStore = useGoalStore((state) => state.clearStore);
  const stabilityScore = useGoalStore((state) => state.stabilityScore);

  const [goalTitle, setGoalTitle] = useState("Deep Work System");
  const [createError, setCreateError] = useState("");
  const [themeKey, setThemeKey] = useState<ConsoleTheme>(getLocalTheme());
  const [clockTick, setClockTick] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      setThemeKey(getLocalTheme());
      setClockTick(Date.now());
    };

    tick();
    const interval = window.setInterval(tick, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const theme = themeTokens[themeKey];

  const handleCreateGoal = () => {
    const result = createGoal({ title: goalTitle });
    setCreateError(result.ok ? "" : result.reason ?? "Unable to create goal.");
  };

  if (!hasHydrated) {
    return (
      <main
        className={`min-h-screen px-4 py-8 transition-colors duration-500 ${theme.page} ${theme.text}`}
      >
        <p className="text-sm">Syncing Digital Lab Console data...</p>
      </main>
    );
  }

  if (!activeGoal) {
    return (
      <main
        className={`min-h-screen px-4 py-8 transition-colors duration-500 ${theme.page} ${theme.text}`}
      >
        <div
          className={`mx-auto w-full max-w-2xl rounded-3xl border p-6 shadow-sm backdrop-blur transition-colors duration-500 ${theme.panel} ${theme.border}`}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Digital Lab Console</p>
          <h1 className="mt-3 text-2xl font-semibold">Initialize Long-term Goal Manager</h1>
          <p className={`mt-2 text-sm ${theme.muted}`}>
            Configure one perpetual goal to drive daily Energy and Progress tracking.
          </p>

          <div className="mt-6">
            <label className={`text-xs uppercase tracking-[0.18em] ${theme.muted}`}>
              Goal Name
            </label>
            <input
              className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors duration-500 focus:border-slate-500 ${theme.input}`}
              onChange={(event) => setGoalTitle(event.target.value)}
              value={goalTitle}
            />
          </div>

          {createError ? <p className="mt-3 text-xs text-red-400">{createError}</p> : null}

          <div className="mt-6 flex justify-end">
            <button
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-500 ${theme.button}`}
              onClick={handleCreateGoal}
              type="button"
            >
              Start Console
            </button>
          </div>
        </div>
      </main>
    );
  }

  const workflowPhase = getCurrentPhase(activeGoal);
  const todayLog = getTodayLog(activeGoal);

  const goalCompletion = useMemo(
    () => calculateGoalCompletion(activeGoal),
    [activeGoal]
  );

  const totalDaysInvested = useMemo(
    () => getDaysActive(activeGoal.startDate),
    [activeGoal.startDate, clockTick]
  );

  const cumulativeFocusTime = useMemo(() => {
    const total = activeGoal.history.reduce((sum, log) => sum + Math.max(0, log.actualDone), 0);
    return Number(total.toFixed(2));
  }, [activeGoal.history]);

  const stabilityInterpretation = useMemo(
    () => getStabilityInterpretation(stabilityScore),
    [stabilityScore]
  );

  const handlePhaseCommit = (payload: {
    phase: "morning" | "afternoon" | "evening";
    energyLevel: number;
    baseTarget: number;
    actualDone: number;
  }) => {
    addDailyLog({
      ...payload,
      date: getTodayKey()
    });
  };

  return (
    <main
      className={`min-h-screen px-4 py-6 transition-colors duration-500 ${theme.page} ${theme.text}`}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header
          className={`rounded-3xl border p-6 shadow-sm backdrop-blur transition-colors duration-500 ${theme.panel} ${theme.border}`}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Digital Lab Console</p>
              <h1 className="mt-3 text-2xl font-semibold">System Integrity: {activeGoal.title}</h1>
              <p className={`mt-2 text-sm ${theme.muted}`}>
                Theme: {theme.label} | Phase: {workflowLabels[workflowPhase]}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                Stability Interpretation: {stabilityInterpretation}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-300/60 bg-slate-100/80 p-3 text-slate-800">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Total Days Invested
                </p>
                <p className="mt-1 text-lg font-semibold">{totalDaysInvested}</p>
              </div>

              <div className="rounded-xl border border-slate-300/60 bg-slate-100/80 p-3 text-slate-800">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Cumulative Focus Time
                </p>
                <p className="mt-1 text-lg font-semibold">{cumulativeFocusTime.toFixed(2)}</p>
              </div>

              <div className="rounded-xl border border-slate-300/60 bg-slate-100/80 p-3 text-slate-800">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Goal Completion
                </p>
                <p className="mt-1 text-lg font-semibold">{goalCompletion.toFixed(2)}%</p>
              </div>

              <div className="rounded-xl border border-slate-300/60 bg-slate-100/80 p-3 text-slate-800">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  System Integrity Score
                </p>
                <p className="mt-1 font-mono text-lg font-semibold">{stabilityScore.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors duration-500 ${theme.button}`}
              onClick={clearStore}
              type="button"
            >
              Reset Goal Store
            </button>
          </div>
        </header>

        <PhaseController
          defaultBaseTarget={todayLog?.baseTarget ?? 10}
          goalCompletion={goalCompletion}
          onCommit={handlePhaseCommit}
          phase={workflowPhase}
          todayLog={todayLog}
        />
      </div>
    </main>
  );
}
