"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTodayKey, getTodayLog, useGoalStore } from "@/lib/store";

const BASE_TASK = 4;
const MAX_HOURS = 6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const calculateRecommended = (energy: number) => {
  if (energy < 50) {
    return BASE_TASK * Math.pow(energy / 50, 2.5);
  }

  if (energy < 80) {
    return BASE_TASK + Math.pow((energy - 50) / 30, 0.6);
  }

  return 5 + (energy - 80) / 20;
};

export function PhaseController() {
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const addDailyLog = useGoalStore((state) => state.addDailyLog);
  const todayLog = useMemo(() => getTodayLog(activeGoal), [activeGoal]);

  const [energy, setEnergy] = useState(50);
  const [actualDone, setActualDone] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!todayLog) {
      setEnergy(50);
      setActualDone(0);
      setIsDirty(false);
      return;
    }

    setEnergy(todayLog.energyLevel);
    setActualDone(todayLog.actualDone || 0);
    setIsDirty(false);
  }, [todayLog]);

  useEffect(() => {
    if (!activeGoal || !isDirty) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      addDailyLog({
        date: getTodayKey(),
        phase: "evening",
        energyLevel: clamp(Math.round(energy), 0, 100),
        baseTarget: BASE_TASK,
        actualDone: Number(clamp(actualDone, 0, MAX_HOURS).toFixed(1))
      });

      setIsDirty(false);
      setIsSaved(true);

      if (savedHintTimerRef.current) {
        clearTimeout(savedHintTimerRef.current);
      }

      savedHintTimerRef.current = setTimeout(() => setIsSaved(false), 2000);
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeGoal, addDailyLog, actualDone, energy, isDirty]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (savedHintTimerRef.current) {
        clearTimeout(savedHintTimerRef.current);
      }
    };
  }, []);

  const recommendedTask = calculateRecommended(energy);
  const clampedRec = clamp(recommendedTask, 0.1, MAX_HOURS);
  const outputPercent = clamp((actualDone / MAX_HOURS) * 100, 0, 100);
  const recLinePercent = clamp((clampedRec / MAX_HOURS) * 100, 0, 100);

  const isMaxed = energy >= 100 && outputPercent >= 100;
  const isGolden = !isMaxed && energy > 80 && actualDone >= clampedRec;

  const getBarStyle = (type: "energy" | "output") => {
    if (isMaxed) {
      return "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-pink-500 via-red-500 to-yellow-500 animate-pulse";
    }

    if (isGolden) {
      return "bg-yellow-400 border-b-4 border-yellow-600";
    }

    return type === "energy"
      ? "bg-purple-500 border-b-4 border-purple-700"
      : "bg-blue-500 border-b-4 border-blue-700";
  };

  const handleSliderChange = (type: "energy" | "output", value: number) => {
    if (type === "energy") {
      setEnergy(value);
    } else {
      setActualDone(value);
    }
    setIsDirty(true);
  };

  return (
    <section className="space-y-12 pt-4">
      <div className="relative flex h-64 select-none items-end justify-center space-x-12 px-4 pb-4">
        <div className="flex w-24 flex-col items-center space-y-3">
          <div className="relative h-48 w-full overflow-hidden rounded-[24px] border-2 border-slate-100 bg-slate-100">
            <div
              className={`absolute bottom-0 w-full transition-all duration-500 ${getBarStyle("energy")}`}
              style={{ height: `${clamp(energy, 0, 100)}%` }}
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            能量 {Math.round(energy)}%
          </div>
        </div>

        <div className="flex w-24 flex-col items-center space-y-3">
          <div className="relative h-48 w-full overflow-hidden rounded-[24px] border-2 border-slate-100 bg-slate-100">
            <div
              className="absolute w-full border-t-4 border-dotted border-slate-300 opacity-60"
              style={{ bottom: `${recLinePercent}%` }}
            />
            <div
              className={`absolute bottom-0 w-full transition-all duration-500 ${getBarStyle("output")}`}
              style={{ height: `${outputPercent}%` }}
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            进度 {actualDone.toFixed(1)}h
          </div>
        </div>
      </div>

      <div className="relative rounded-[24px] border-2 border-slate-200 bg-slate-50 p-6">
        <p className="text-sm font-bold leading-relaxed text-slate-600">能量与进度已就绪。</p>
        <div
          className={`absolute bottom-2 right-4 text-[9px] font-bold text-slate-300 transition-opacity duration-500 ${
            isSaved ? "opacity-100" : "opacity-0"
          }`}
        >
          ● 已同步
        </div>
      </div>

      <div className="space-y-8 px-2 pb-6">
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max="100"
            value={energy}
            onChange={(event) => handleSliderChange("energy", Number(event.target.value))}
            className="w-full h-5 cursor-pointer appearance-none rounded-full border-2 border-slate-100 bg-slate-100 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max={MAX_HOURS}
            step="0.1"
            value={actualDone}
            onChange={(event) => handleSliderChange("output", Number(event.target.value))}
            className="w-full h-5 cursor-pointer appearance-none rounded-full border-2 border-slate-100 bg-slate-100 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
      </div>
    </section>
  );
}

export default PhaseController;
