"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentPhase, getTodayKey, getTodayLog, useGoalStore } from "@/lib/store";

const BASE_TASK = 4;
const MAX_TASK = 6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const calculateRecommended = (energy: number) => {
  if (energy < 50) {
    const ratio = energy / 50;
    return BASE_TASK * Math.pow(ratio, 2.5);
  }

  if (energy < 80) {
    const ratio = (energy - 50) / 30;
    return BASE_TASK + Math.pow(ratio, 0.6);
  }

  const ratio = (energy - 80) / 20;
  return 5 + ratio;
};

const getToleranceThreshold = (energy: number) => {
  if (energy >= 50) {
    return 0.95;
  }

  return 0.95 - ((50 - energy) / 50) * 0.45;
};

export function PhaseController() {
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const addDailyLog = useGoalStore((state) => state.addDailyLog);

  const todayLog = useMemo(() => getTodayLog(activeGoal), [activeGoal]);

  const [energy, setEnergy] = useState(50);
  const [actualDone, setActualDone] = useState(0);
  const [energyTouched, setEnergyTouched] = useState(false);
  const [outputTouched, setOutputTouched] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!todayLog) {
      setEnergy(50);
      setActualDone(0);
      setEnergyTouched(false);
      setOutputTouched(false);
      setHasUnsavedChanges(false);
      return;
    }

    setEnergy(todayLog.energyLevel);
    setActualDone(todayLog.actualDone || 0);
    setEnergyTouched(todayLog.energyLevel !== 50 || todayLog.actualDone > 0);
    setOutputTouched(todayLog.actualDone > 0);
    setHasUnsavedChanges(false);
  }, [todayLog]);

  const handleSliderChange = (type: "energy" | "output", value: number) => {
    setHasUnsavedChanges(true);
    if (type === "energy") {
      setEnergy(value);
      setEnergyTouched(true);
      return;
    }

    setActualDone(value);
    setOutputTouched(true);
  };

  const recommendedTask = calculateRecommended(energy);
  const clampedRec = clamp(recommendedTask, 0.1, MAX_TASK);

  const outputPercent = clamp((actualDone / MAX_TASK) * 100, 0, 100);
  const recLinePercent = clamp((clampedRec / MAX_TASK) * 100, 0, 100);
  const toleranceRatio = getToleranceThreshold(energy);

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

    if (!energyTouched) {
      return "bg-slate-200 border-b-4 border-slate-300";
    }

    return "bg-blue-500 border-b-4 border-blue-700";
  };

  const getFeedback = () => {
    if (!energyTouched && !outputTouched && energy === 50) {
      return {
        title: "准备出发",
        text: "首先，滑动左侧确认今天的能量状态。",
        bg: "bg-slate-50 text-slate-500 border-slate-200"
      };
    }

    if (energyTouched && !outputTouched) {
      if (energy < 40) {
        return {
          title: "能量低",
          text: "累了可以休息休息，不用勉强。",
          bg: "bg-slate-50 text-slate-600 border-slate-200"
        };
      }

      if (energy <= 75) {
        return {
          title: "平稳",
          text: "平凡的一天也很珍贵。",
          bg: "bg-blue-50 text-blue-900 border-blue-200"
        };
      }

      return {
        title: "能量高",
        text: "今天心情还不错嘛！感觉能做很多事。",
        bg: "bg-yellow-50 text-yellow-900 border-yellow-200"
      };
    }

    if (isMaxed) {
      return {
        title: "完美共振",
        text: "不可思议的状态！知行合一的最高境界。",
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

    if (isResilient) {
      return {
        title: "韧性生长",
        text: "你把状态拉回来了。在低谷期能做到这样，比满分更珍贵。",
        bg: "bg-purple-50 text-purple-900 border-purple-200"
      };
    }

    if (energy < 50 && !isResilient) {
      return {
        title: "允许低谷",
        text: "今天确实不容易。系统已自动降低负荷，好好休息。",
        bg: "bg-slate-50 text-slate-600 border-slate-200"
      };
    }

    if (energy >= 50 && actualDone >= clampedRec) {
      return {
        title: "稳定积累",
        text: "保持这种节奏。水滴石穿的力量，往往是无声的。",
        bg: "bg-blue-50 text-blue-900 border-blue-200"
      };
    }

    if (energy >= 50 && actualDone < clampedRec) {
      return {
        title: "接纳波动",
        text: "能量充足但产出未满？没关系，接受波动也是一种能力。",
        bg: "bg-orange-50 text-orange-900 border-orange-200"
      };
    }

    return {
      title: "记录中",
      text: "请滑动下侧图标确认今日的能量状态。",
      bg: "bg-slate-50 text-slate-600 border-slate-200"
    };
  };

  const feedback = getFeedback();
  const actualDoneDisplay = Number(actualDone.toFixed(1));

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
    setHasUnsavedChanges(false);
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

          <div
            className={`group flex flex-col items-center space-y-3 w-24 transition-opacity duration-300 ${
              !energyTouched ? "opacity-50 grayscale" : "opacity-100"
            }`}
          >
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">进度</div>
              <div
                className={`text-xl font-bold font-mono ${
                  isMaxed ? "text-pink-500" : isGolden ? "text-yellow-500" : "text-blue-500"
                }`}
              >
                {actualDoneDisplay}h
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
            <p
              key={feedback.text}
              className="text-sm font-bold leading-relaxed transition-all duration-300"
            >
              {feedback.text}
            </p>
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
              onChange={(event) => handleSliderChange("energy", Number(event.target.value))}
              className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none border-2 border-slate-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_0px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95"
            />
          </div>

          <div
            className={`space-y-3 transition-opacity duration-300 ${
              !energyTouched ? "opacity-40 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>没做</span>
              <span>超额完成</span>
            </div>
            <input
              type="range"
              min="0"
              max={MAX_TASK}
              step="0.1"
              value={actualDone}
              disabled={!energyTouched}
              onChange={(event) => handleSliderChange("output", Number(event.target.value))}
              className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none border-2 border-slate-100 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_0px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges && !isMaxed}
          className={`w-full py-4 rounded-[20px] font-bold text-base tracking-wide transition-all duration-300 active:translate-y-1 active:shadow-none ${
            hasUnsavedChanges || isMaxed
              ? isMaxed
                ? "bg-pink-500 text-white shadow-[0_6px_0_#be185d]"
                : isGolden
                  ? "bg-yellow-400 text-yellow-900 shadow-[0_6px_0_#ca8a04]"
                  : "bg-slate-900 text-white shadow-[0_6px_0_#0f172a]"
              : "bg-slate-200 text-slate-400 shadow-none cursor-default"
          }`}
          type="button"
        >
          {isMaxed ? "记录高光时刻！" : hasUnsavedChanges ? "确定" : "已同步"}
        </button>
      </section>
    </>
  );
}

export default PhaseController;
