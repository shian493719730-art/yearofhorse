"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentPhase, getTodayKey, getTodayLog, useGoalStore } from "@/lib/store";

const BASE_TASK = 4;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getGradient = (type: "energy" | "output", value: number) => {
  if (value >= 100) {
    return "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-rose-400 via-fuchsia-500 to-indigo-500 animate-pulse";
  }

  if (type === "energy") {
    if (value < 60) {
      return "bg-gradient-to-t from-violet-600 to-violet-300";
    }

    if (value < 90) {
      return "bg-gradient-to-t from-emerald-500 to-emerald-300";
    }

    return "bg-gradient-to-t from-amber-400 to-yellow-200";
  }

  if (value < 60) {
    return "bg-gradient-to-t from-blue-700 to-blue-400";
  }

  if (value < 90) {
    return "bg-gradient-to-t from-cyan-500 to-cyan-300";
  }

  return "bg-gradient-to-t from-orange-500 to-orange-300";
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

  const recommendedTask = BASE_TASK * (energy / 100 + 0.3);
  const clampedRec = clamp(recommendedTask, 1, 6);

  const outputPercent = clamp((actualDone / 6) * 100, 0, 100);
  const recLinePercent = clamp((clampedRec / 6) * 100, 0, 100);

  const feedback = {
    title: "今日小结",
    text: "数据已记录。无论怎样，今天过去了。",
    bg: "bg-slate-50 text-slate-600"
  };

  const handleSave = () => {
    if (!activeGoal) {
      return;
    }

    const phase = getCurrentPhase(activeGoal);
    const commitPhase = phase === "completed" ? "evening" : phase;

    addDailyLog({
      date: getTodayKey(),
      phase: commitPhase,
      energyLevel: clamp(Math.round(energy), 0, 100),
      baseTarget: BASE_TASK,
      actualDone: Math.max(0, actualDone)
    });
  };

  return (
    <section className="space-y-10 pt-4">
      <div className="flex justify-center items-end space-x-12 h-64 select-none px-4 pb-4">
        <div className="group flex flex-col items-center space-y-3 w-24">
          <div className="relative w-full h-48 bg-slate-100 rounded-[24px] overflow-hidden shadow-inner border border-white/60">
            <div
              className={`absolute bottom-0 w-full transition-all duration-700 ease-out rounded-[24px] ${getGradient("energy", energy)}`}
              style={{ height: `${energy}%` }}
            />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">能量</div>
            <div className="text-xl font-bold text-slate-800 font-mono">{Math.round(energy)}%</div>
          </div>
        </div>

        <div className="group flex flex-col items-center space-y-3 w-24">
          <div className="relative w-full h-48 bg-slate-100 rounded-[24px] overflow-hidden shadow-inner border border-white/60">
            <div
              className="absolute w-full border-t-2 border-dashed border-slate-400/50 z-20 transition-all duration-500 flex items-center justify-end pr-1"
              style={{ bottom: `${recLinePercent}%` }}
            >
              <span className="text-[9px] font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md -mr-10 whitespace-nowrap">
                今日目标
              </span>
            </div>

            <div
              className={`absolute bottom-0 w-full transition-all duration-700 ease-out rounded-[24px] ${getGradient("output", outputPercent)}`}
              style={{ height: `${outputPercent}%` }}
            />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">产出</div>
            <div className="text-xl font-bold text-slate-800 font-mono">{actualDone}h</div>
          </div>
        </div>
      </div>

      <div
        className={`p-6 rounded-[24px] transition-all duration-500 ${feedback.bg} relative overflow-hidden border border-black/5`}
      >
        <div className="relative z-10">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
            {feedback.title}
          </h3>
          <p className="text-sm font-medium leading-relaxed opacity-90">{feedback.text}</p>
        </div>
      </div>

      <div className="space-y-8 px-2">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>有点累</span>
            <span>精力充沛</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={energy}
            onChange={(event) => setEnergy(Number(event.target.value))}
            className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_10px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-100 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>没做</span>
            <span>超额完成</span>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={actualDone}
            onChange={(event) => setActualDone(Number(event.target.value))}
            className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_10px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-100 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-bold text-sm tracking-wide shadow-xl shadow-slate-900/10 hover:scale-[1.01] active:scale-95 transition-all duration-300"
        type="button"
      >
        记录今天
      </button>
    </section>
  );
}

export default PhaseController;
