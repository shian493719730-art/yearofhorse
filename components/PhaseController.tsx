"use client";

import { useEffect, useMemo, useState } from "react";
import ProgressCircle from "@/components/ProgressCircle";
import { getCurrentPhase, getTodayKey, getTodayLog, useGoalStore } from "@/lib/store";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const BASE_TARGET = 4;

const getBatteryColor = (percent: number) => {
  if (percent < 30) {
    return "#EF4444";
  }

  if (percent < 70) {
    return "#22C55E";
  }

  if (percent < 90) {
    return "#D4AF37";
  }

  return "linear-gradient(90deg, #EC4899 0%, #8B5CF6 35%, #3B82F6 70%, #10B981 100%)";
};

export function PhaseController() {
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const addDailyLog = useGoalStore((state) => state.addDailyLog);

  const todayLog = useMemo(() => getTodayLog(activeGoal), [activeGoal]);

  const [energy, setEnergy] = useState(50);
  const [actualDone, setActualDone] = useState(0);

  useEffect(() => {
    if (!todayLog) {
      setEnergy(50);
      setActualDone(0);
      return;
    }

    setEnergy(todayLog.energyLevel);
    setActualDone(todayLog.actualDone || 0);
  }, [todayLog]);

  const completionPercent = useMemo(
    () => clamp((actualDone / BASE_TARGET) * 100, 0, 100),
    [actualDone]
  );

  const batteryBackground = getBatteryColor(completionPercent);

  const handleSave = () => {
    if (!activeGoal) {
      return;
    }

    const phase = getCurrentPhase(activeGoal);
    const commitPhase = phase === "completed" ? "evening" : phase;

    addDailyLog({
      date: getTodayKey(),
      phase: commitPhase,
      energyLevel: clamp(energy, 0, 100),
      baseTarget: BASE_TARGET,
      actualDone: Math.max(0, actualDone)
    });
  };

  return (
    <section className="flex flex-col items-center space-y-8 py-4">
      <div className="scale-110">
        <ProgressCircle energy={energy} percent={completionPercent} />
      </div>

      <div className="w-full max-w-[220px] space-y-1 text-center">
        <div className="h-2 w-full overflow-hidden rounded-full border border-black/5 bg-slate-300/60">
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${completionPercent}%`,
              background: batteryBackground,
              animation: completionPercent >= 90 ? "spectrumShift 2.8s linear infinite" : "none",
              backgroundSize: completionPercent >= 90 ? "220% 100%" : "100% 100%"
            }}
          />
        </div>
        <p className="text-[10px] font-bold opacity-50">今日进度: {Math.round(completionPercent)}%</p>
      </div>

      <div className="w-full space-y-6 rounded-3xl border border-current/10 bg-current/5 p-6 backdrop-blur-sm">
        <div className="space-y-3">
          <div className="flex justify-between text-xs font-bold opacity-70">
            <span>有点累</span>
            <span>今日状态</span>
            <span>精力充沛</span>
          </div>
          <input
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-current"
            max={100}
            min={0}
            onChange={(event) => setEnergy(Number(event.target.value))}
            type="range"
            value={energy}
          />
          <div className="text-right text-xs font-bold opacity-50">{Math.round(energy)}%</div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs font-bold opacity-70">
            <span>没做</span>
            <span>实际专注</span>
            <span>4小时+</span>
          </div>
          <input
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-current"
            max={6}
            min={0}
            onChange={(event) => setActualDone(Number(event.target.value))}
            step={0.5}
            type="range"
            value={actualDone}
          />
          <div className="text-right text-xs font-bold opacity-50">{actualDone} 小时</div>
        </div>

        <button
          className="w-full rounded-xl border border-current/20 bg-current/10 py-3 text-sm font-bold transition-all hover:bg-current/20"
          onClick={handleSave}
          type="button"
        >
          记录今天
        </button>
      </div>
    </section>
  );
}

export default PhaseController;
