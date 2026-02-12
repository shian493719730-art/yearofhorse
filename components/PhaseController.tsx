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
  const performanceRatio = clampedRec === 0 ? 0 : (actualDone / clampedRec) * 100;

  const feedback = useMemo(() => {
    if (energy > 60 && performanceRatio > 80) {
      return {
        title: "状态保持",
        text: "你今天一直在自己的节奏里。稳定比爆发更难得。",
        bg: "bg-blue-50 text-blue-900",
        icon: "💧"
      };
    }

    if (energy < 40 && performanceRatio < 60) {
      return {
        title: "允许低谷",
        text: "今天确实不容易。有些日子，本来就不是用来冲刺的。",
        bg: "bg-slate-50 text-slate-600",
        icon: "🍂"
      };
    }

    if (energy < 50 && performanceRatio > 90) {
      return {
        title: "状态回升",
        text: "你把状态拉回来了。这比完成任务更难。",
        bg: "bg-orange-50 text-orange-900",
        icon: "🔥"
      };
    }

    return {
      title: "今日小结",
      text: "努力被看见，波动被允许。无论怎样，今天过去了。",
      bg: "bg-green-50 text-green-900",
      icon: "🌱"
    };
  }, [energy, performanceRatio]);

  const outputHeight = clamp((actualDone / 6) * 100, 0, 100);
  const expectedLine = clamp((clampedRec / 6) * 100, 0, 100);

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
      <div className="flex justify-center items-end space-x-8 h-48 select-none">
        <div className="group flex flex-col items-center space-y-3 w-20">
          <div className="relative w-full h-32 bg-slate-100 rounded-[20px] overflow-hidden">
            <div
              className="absolute bottom-0 w-full bg-slate-900 transition-all duration-500 ease-out rounded-[20px]"
              style={{ height: `${energy}%` }}
            />
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">能量</div>
            <div className="text-xl font-bold text-slate-900">{Math.round(energy)}%</div>
          </div>
        </div>

        <div className="h-32 flex items-center justify-center opacity-20">
          <div className="w-px h-10 bg-slate-900" />
        </div>

        <div className="group flex flex-col items-center space-y-3 w-20">
          <div className="relative w-full h-32 bg-slate-100 rounded-[20px] overflow-hidden">
            <div
              className="absolute w-full border-t-2 border-dashed border-slate-300 z-10 transition-all duration-500"
              style={{ bottom: `${expectedLine}%` }}
            />

            <div
              className="absolute bottom-0 w-full bg-blue-500 transition-all duration-500 ease-out rounded-[20px]"
              style={{ height: `${outputHeight}%` }}
            />
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">产出</div>
            <div className="text-xl font-bold text-blue-600">{actualDone}h</div>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-3xl transition-all duration-500 ${feedback.bg}`}>
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-xl">{feedback.icon}</span>
          <h3 className="text-sm font-bold uppercase tracking-wide opacity-80">{feedback.title}</h3>
        </div>
        <p className="text-sm font-medium leading-relaxed opacity-90">{feedback.text}</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>低能量状态</span>
            <span>精力充沛</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={energy}
            onChange={(event) => setEnergy(Number(event.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-100 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>未开始</span>
            <span>超额完成</span>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={actualDone}
            onChange={(event) => setActualDone(Number(event.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/30 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-5 bg-slate-900 text-white rounded-3xl font-bold text-sm tracking-wide shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all duration-300"
        type="button"
      >
        记录今天
      </button>
    </section>
  );
}

export default PhaseController;
