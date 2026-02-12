"use client";

import { useEffect, useMemo, useState } from "react";
import { getTodayKey, getTodayLog, useGoalStore } from "@/lib/store";

type Feedback = {
  title: string;
  text: string;
  bg: string;
};

const MAX_HOURS = 6;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const calculateRecommended = (energy: number) => {
  const base = 4;
  if (energy < 50) {
    return base * Math.pow(energy / 50, 2.5);
  }

  if (energy < 80) {
    return base + Math.pow((energy - 50) / 30, 0.6);
  }

  return 5 + (energy - 80) / 20;
};

export function PhaseController() {
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const addDailyLog = useGoalStore((state) => state.addDailyLog);
  const todayLog = useMemo(() => getTodayLog(activeGoal), [activeGoal]);

  const [energy, setEnergy] = useState(50);
  const [actualDone, setActualDone] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedFeedback, setConfirmedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!todayLog) {
      setEnergy(50);
      setActualDone(0);
      setIsConfirmed(false);
      setConfirmedFeedback(null);
      return;
    }

    setEnergy(todayLog.energyLevel);
    setActualDone(Number(todayLog.actualDone.toFixed(1)));
    setIsConfirmed(todayLog.actualDone > 0 || todayLog.energyLevel !== 50);
  }, [todayLog]);

  const recommendedTask = useMemo(() => calculateRecommended(energy), [energy]);
  const clampedRec = clamp(recommendedTask, 0.1, MAX_HOURS);
  const outputPercent = clamp((actualDone / MAX_HOURS) * 100, 0, 100);
  const recLinePercent = clamp((clampedRec / MAX_HOURS) * 100, 0, 100);

  const toleranceRatio = energy >= 50 ? 0.95 : 0.95 - ((50 - energy) / 50) * 0.45;
  const isResilient = energy < 50 && actualDone >= clampedRec * toleranceRatio;
  const isMaxed = energy >= 100 && outputPercent >= 100;
  const isGolden = !isMaxed && energy > 80 && actualDone >= clampedRec;

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

    if (!isConfirmed) {
      return "bg-slate-200 border-b-4 border-slate-300";
    }

    return "bg-blue-500 border-b-4 border-blue-700";
  };

  const handleConfirm = () => {
    let nextFeedback: Feedback;

    if (!isConfirmed) {
      if (energy < 40) {
        nextFeedback = {
          title: "能量低",
          text: "累了可以休息休息，不用勉强。",
          bg: "bg-slate-50 text-slate-600 border-slate-200"
        };
      } else if (energy <= 75) {
        nextFeedback = {
          title: "平稳",
          text: "平凡的一天也很珍贵。",
          bg: "bg-blue-50 text-blue-900 border-blue-200"
        };
      } else {
        nextFeedback = {
          title: "能量高",
          text: "今天心情还不错嘛！感觉能做很多事。",
          bg: "bg-yellow-50 text-yellow-900 border-yellow-200"
        };
      }

      setIsConfirmed(true);
    } else if (isMaxed) {
      nextFeedback = {
        title: "完美共振",
        text: "不可思议的状态！知行合一的最高境界。",
        bg: "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-900 border-purple-200"
      };
    } else if (isGolden) {
      nextFeedback = {
        title: "状态极佳",
        text: "能量充沛，且不仅是空想。太强了。",
        bg: "bg-yellow-50 text-yellow-900 border-yellow-200"
      };
    } else if (isResilient) {
      nextFeedback = {
        title: "韧性生长",
        text: "你把状态拉回来了。在低谷期能做到这样，比满分更珍贵。",
        bg: "bg-purple-50 text-purple-900 border-purple-200"
      };
    } else if (energy < 50) {
      nextFeedback = {
        title: "允许低谷",
        text: "今天确实不容易。系统已自动降低负荷，好好休息。",
        bg: "bg-slate-50 text-slate-600 border-slate-200"
      };
    } else if (actualDone >= clampedRec) {
      nextFeedback = {
        title: "稳定积累",
        text: "保持这种节奏。水滴石穿的力量，往往是无声的。",
        bg: "bg-blue-50 text-blue-900 border-blue-200"
      };
    } else {
      nextFeedback = {
        title: "接纳波动",
        text: "能量充足但产出未满？没关系，接受波动也是一种能力。",
        bg: "bg-orange-50 text-orange-900 border-orange-200"
      };
    }

    setConfirmedFeedback(nextFeedback);
    addDailyLog({
      date: getTodayKey(),
      phase: "evening",
      energyLevel: clamp(Math.round(energy), 0, 100),
      baseTarget: 4,
      actualDone: Number(actualDone.toFixed(1))
    });
  };

  const feedbackCard = confirmedFeedback ?? {
    title: "新手引导",
    text: "设定初始能量条，点击确定开启这一天。",
    bg: "bg-slate-50 text-slate-500 border-slate-200"
  };

  return (
    <section className="space-y-10 pt-4">
      <div className="flex h-64 select-none items-end justify-center space-x-12 px-4 pb-4">
        <div className="group flex w-24 flex-col items-center space-y-3">
          <div className="relative h-48 w-full overflow-hidden rounded-[24px] border-2 border-slate-100 bg-slate-100">
            <div
              className={`absolute bottom-0 w-full rounded-[20px] transition-all duration-500 ease-out ${getBarStyle("energy")}`}
              style={{ height: `${energy}%` }}
            />
          </div>
          <div className="text-center">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">能量</div>
            <div
              className={`font-mono text-xl font-bold ${
                isMaxed ? "text-pink-500" : isGolden ? "text-yellow-500" : "text-purple-500"
              }`}
            >
              {Math.round(energy)}%
            </div>
          </div>
        </div>

        <div
          className={`group flex w-24 flex-col items-center space-y-3 transition-opacity duration-300 ${
            !isConfirmed ? "pointer-events-none opacity-50 grayscale" : "opacity-100"
          }`}
        >
          <div className="relative h-48 w-full overflow-hidden rounded-[24px] border-2 border-slate-100 bg-slate-100">
            <div
              className="absolute w-full border-t-4 border-dotted border-slate-300 opacity-60 transition-all duration-500"
              style={{ bottom: `${recLinePercent}%` }}
            />

            <div
              className={`absolute bottom-0 w-full rounded-[20px] transition-all duration-500 ease-out ${getBarStyle("output")}`}
              style={{ height: `${outputPercent}%` }}
            />
          </div>
          <div className="text-center">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">进度</div>
            <div
              className={`font-mono text-xl font-bold ${
                isMaxed ? "text-pink-500" : isGolden ? "text-yellow-500" : "text-blue-500"
              }`}
            >
              {actualDone.toFixed(1)}h
            </div>
          </div>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-[24px] border-2 p-6 transition-all duration-300 ${feedbackCard.bg}`}
      >
        <div className="relative z-10">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest opacity-60">{feedbackCard.title}</h3>
          <p className="text-sm font-bold leading-relaxed">{feedbackCard.text}</p>
        </div>
      </div>

      <div className="space-y-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
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

        <div className={`space-y-3 transition-opacity duration-300 ${!isConfirmed ? "opacity-40" : "opacity-100"}`}>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>没做</span>
            <span>超额完成</span>
          </div>
          <input
            type="range"
            min="0"
            max={MAX_HOURS}
            step="0.1"
            value={actualDone}
            disabled={!isConfirmed}
            onChange={(event) => setActualDone(Number(event.target.value))}
            className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none border-2 border-slate-100 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_0px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95"
          />
        </div>
      </div>

      <button
        onClick={handleConfirm}
        type="button"
        className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-bold shadow-[0_6px_0_#0f172a] active:translate-y-1 active:shadow-none transition-all"
      >
        确定
      </button>
    </section>
  );
}

export default PhaseController;
