"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentPhase, getTodayKey, getTodayLog, useGoalStore } from "@/lib/store";

const BASE_TASK = 4;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

  const isMaxed = energy >= 100 && outputPercent >= 100;
  const isGolden = !isMaxed && energy > 80 && actualDone > clampedRec;

  const getBarStyle = (type: "energy" | "output") => {
    if (isMaxed) {
      return "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-pink-500 via-red-500 to-yellow-500 animate-pulse shadow-[0_0_30px_rgba(236,72,153,0.6)]";
    }

    if (isGolden) {
      return "bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse border-b-4 border-yellow-600";
    }

    if (type === "energy") {
      return "bg-purple-500 border-b-4 border-purple-700";
    }

    return "bg-blue-500 border-b-4 border-blue-700";
  };

  const getFeedback = () => {
    if (isMaxed) {
      return {
        title: "完美共振",
        text: "不可思议的状态！你今天在发光！",
        bg: "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-900 border-purple-200"
      };
    }

    if (isGolden) {
      return {
        title: "状态极佳",
        text: "能量充沛，且不仅是空想。太强了。",
        bg: "bg-yellow-50 text-yellow-900 border-yellow-200"
      };
    }

    const performanceRatio = clampedRec === 0 ? 0 : (actualDone / clampedRec) * 100;

    if (energy < 40 && performanceRatio < 60) {
      return {
        title: "允许低谷",
        text: "今天确实不容易，允许自己休息一下。",
        bg: "bg-slate-50 text-slate-600 border-slate-200"
      };
    }

    if (energy > 60 && performanceRatio < 50) {
      return {
        title: "需要行动",
        text: "你有能量，试着把它们转化成行动吧。",
        bg: "bg-blue-50 text-blue-900 border-blue-200"
      };
    }

    return {
      title: "今日小结",
      text: "数据已记录。无论怎样，今天过去了。",
      bg: "bg-slate-50 text-slate-600 border-slate-200"
    };
  };

  const feedback = getFeedback();

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
    <>
      {isMaxed ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 border-4 border-fuchsia-300/50 animate-pulse"
        />
      ) : null}

      <section className={`space-y-10 pt-4 transition-all duration-500 ${isMaxed ? "scale-[1.02]" : ""}`}>
        <div className="flex justify-center items-end space-x-12 h-64 select-none px-4 pb-4">
          <div className="group flex flex-col items-center space-y-3 w-24">
            <div className="relative w-full h-48 bg-slate-100 rounded-[24px] overflow-hidden border-2 border-slate-100">
              <div
                className={`absolute bottom-0 w-full transition-all duration-500 ease-out rounded-[20px] ${getBarStyle("energy")}`}
                style={{ height: `${energy}%` }}
              />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">能量</div>
              <div
                className={`text-xl font-bold font-mono ${
                  isMaxed ? "text-pink-500" : isGolden ? "text-yellow-500" : "text-purple-500"
                }`}
              >
                {Math.round(energy)}%
              </div>
            </div>
          </div>

          <div className="group flex flex-col items-center space-y-3 w-24">
            <div className="relative w-full h-48 bg-slate-100 rounded-[24px] overflow-hidden border-2 border-slate-100">
              <div
                className="absolute w-full border-t-4 border-dotted border-slate-300 z-20 transition-all duration-500 opacity-60"
                style={{ bottom: `${recLinePercent}%` }}
              />

              <div
                className={`absolute bottom-0 w-full transition-all duration-500 ease-out rounded-[20px] ${getBarStyle("output")}`}
                style={{ height: `${outputPercent}%` }}
              />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">产出</div>
              <div
                className={`text-xl font-bold font-mono ${
                  isMaxed ? "text-pink-500" : isGolden ? "text-yellow-500" : "text-blue-500"
                }`}
              >
                {actualDone}h
              </div>
            </div>
          </div>
        </div>

        <div
          className={`p-6 rounded-[24px] transition-all duration-300 border-2 ${feedback.bg} relative overflow-hidden`}
        >
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">
              {feedback.title}
            </h3>
            <p className="text-sm font-bold leading-relaxed">{feedback.text}</p>
          </div>
          {isMaxed ? <div className="absolute inset-0 bg-white/20 animate-pulse" /> : null}
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
              className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none border-2 border-slate-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_0px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95"
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
              className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none border-2 border-slate-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_0px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-4 text-white rounded-[20px] font-bold text-base tracking-wide transition-all duration-200 active:translate-y-1 active:shadow-none ${
            isMaxed
              ? "bg-pink-500 shadow-[0_6px_0_#be185d]"
              : isGolden
                ? "bg-yellow-400 text-yellow-900 shadow-[0_6px_0_#ca8a04]"
                : "bg-slate-900 shadow-[0_6px_0_#0f172a]"
          }`}
          type="button"
        >
          {isMaxed ? "记录高光时刻！" : "记录今天"}
        </button>
      </section>
    </>
  );
}

export default PhaseController;
