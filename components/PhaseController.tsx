"use client";

import { useEffect, useMemo, useState } from "react";
import ProgressCircle from "@/components/ProgressCircle";
import { calculateProgress, type DailyLog, type DayPhase } from "@/lib/store";

type CommitPhase = Exclude<DayPhase, "completed">;

type CommitPayload = {
  phase: CommitPhase;
  energyLevel: number;
  baseTarget: number;
  actualDone: number;
};

type PhaseControllerProps = {
  phase: DayPhase;
  todayLog: DailyLog | null;
  goalCompletion: number;
  defaultBaseTarget?: number;
  onCommit: (payload: CommitPayload) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const actionButtonClass =
  "rounded-xl border border-slate-900/10 bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors duration-300 hover:bg-slate-700";

const getPhaseTitle = (phase: DayPhase) => {
  if (phase === "morning") {
    return "Morning Calibration";
  }

  if (phase === "afternoon") {
    return "Afternoon Throughput";
  }

  if (phase === "evening") {
    return "Evening Consolidation";
  }

  return "Cycle Complete";
};

const getPhaseDescription = (phase: DayPhase) => {
  if (phase === "morning") {
    return "Set baseline energy and target before work begins.";
  }

  if (phase === "afternoon") {
    return "Track live output and calibrate energy while executing tasks.";
  }

  if (phase === "evening") {
    return "Finalize day metrics and lock in the daily record.";
  }

  return "All checkpoints for today are complete.";
};

const getCommitLabel = (phase: DayPhase) => {
  if (phase === "morning") {
    return "Commit Morning Baseline";
  }

  if (phase === "afternoon") {
    return "Save Afternoon Metrics";
  }

  if (phase === "evening") {
    return "Finalize Daily Record";
  }

  return "Completed";
};

const getBatteryStyle = (completion: number): React.CSSProperties => {
  const safeCompletion = clamp(completion, 0, 100);
  const style: React.CSSProperties = {
    width: `${safeCompletion}%`,
    height: "100%",
    borderRadius: "9999px",
    transition: "width 500ms ease, background 500ms ease"
  };

  if (safeCompletion <= 30) {
    return { ...style, background: "#EF4444" };
  }

  if (safeCompletion <= 70) {
    return { ...style, background: "#22C55E" };
  }

  if (safeCompletion <= 90) {
    return { ...style, background: "#D4AF37" };
  }

  return {
    ...style,
    background:
      "linear-gradient(90deg, #8B5CF6 0%, #3B82F6 20%, #10B981 40%, #F59E0B 60%, #EF4444 80%, #EC4899 100%)",
    backgroundSize: "220% 100%",
    animation: "spectrumShift 2.8s linear infinite"
  };
};

export function PhaseController({
  phase,
  todayLog,
  goalCompletion,
  defaultBaseTarget = 10,
  onCommit
}: PhaseControllerProps) {
  const [energy, setEnergy] = useState<number>(todayLog?.energyLevel ?? 65);
  const [actualDone, setActualDone] = useState<number>(todayLog?.actualDone ?? 0);
  const [baseTarget, setBaseTarget] = useState<number>(
    todayLog?.baseTarget ?? defaultBaseTarget
  );

  const logKey = todayLog
    ? `${todayLog.date}-${todayLog.phase}-${todayLog.energyLevel}-${todayLog.actualDone}-${todayLog.baseTarget}`
    : "no-log";

  useEffect(() => {
    setEnergy(todayLog?.energyLevel ?? 65);
    setActualDone(todayLog?.actualDone ?? 0);
    setBaseTarget(todayLog?.baseTarget ?? defaultBaseTarget);
  }, [defaultBaseTarget, logKey, todayLog]);

  const previewCompletion = useMemo(
    () => calculateProgress(energy, actualDone, baseTarget),
    [actualDone, baseTarget, energy]
  );

  const adjustedTarget = useMemo(() => {
    const value = baseTarget * (energy / 100 + 0.5);
    return Number(value.toFixed(2));
  }, [baseTarget, energy]);

  const dailyCompletion = clamp(previewCompletion, 0, 100);
  const batteryStyle = getBatteryStyle(dailyCompletion);
  const title = getPhaseTitle(phase);

  const isEditable = phase !== "completed";
  const supportsOutputEntry = phase === "afternoon" || phase === "evening";

  const handleCommit = () => {
    if (phase === "completed") {
      return;
    }

    onCommit({
      phase,
      energyLevel: clamp(energy, 0, 100),
      baseTarget: Math.max(1, baseTarget),
      actualDone: phase === "morning" ? 0 : Math.max(0, actualDone)
    });
  };

  return (
    <section className="w-full rounded-3xl border border-slate-300/80 bg-white/75 p-6 shadow-sm backdrop-blur transition-colors duration-500">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <ProgressCircle label="Energy Index" value={energy} />

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[11px] text-slate-600">
              <span>Daily Completion</span>
              <span>{dailyCompletion.toFixed(2)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-300">
              <div style={batteryStyle} />
            </div>
          </div>

          <div className="mt-5 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
            <p>Goal Completion: {goalCompletion.toFixed(2)}%</p>
            <p>Adjusted Target: {adjustedTarget}</p>
            <p>Current Output: {Math.max(0, actualDone)}</p>
          </div>
        </aside>

        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{getPhaseDescription(phase)}</p>

          {isEditable ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    Base Target
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-300 focus:border-slate-500"
                    min={1}
                    onChange={(event) =>
                      setBaseTarget(Math.max(1, Number(event.target.value) || 1))
                    }
                    type="number"
                    value={baseTarget}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    Actual Output
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-300 focus:border-slate-500"
                    disabled={!supportsOutputEntry}
                    min={0}
                    onChange={(event) =>
                      setActualDone(Math.max(0, Number(event.target.value) || 0))
                    }
                    type="number"
                    value={supportsOutputEntry ? actualDone : 0}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Current Energy: {energy}
                </label>
                <input
                  className="mt-3 h-2 w-full cursor-pointer accent-slate-900"
                  max={100}
                  min={0}
                  onChange={(event) => setEnergy(Number(event.target.value))}
                  type="range"
                  value={energy}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>Live Daily Completion: {dailyCompletion.toFixed(2)}%</p>
                <p className="mt-1">Target After Energy Adjustment: {adjustedTarget}</p>
              </div>

              <div className="flex justify-end">
                <button className={actionButtonClass} onClick={handleCommit} type="button">
                  {getCommitLabel(phase)}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>Today&apos;s cycle is complete.</p>
              <p className="mt-1">Final Completion: {dailyCompletion.toFixed(2)}%</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default PhaseController;
