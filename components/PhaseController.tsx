"use client";

import { useEffect, useState } from "react";
import { getTodayKey, useGoalStore } from "@/lib/store";

export function PhaseController() {
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const records = useGoalStore((state) => state.records);
  const addRecord = useGoalStore((state) => state.addRecord);

  const [energy, setEnergy] = useState(50);
  const [progress, setProgress] = useState(0);
  const [isFirstTimeToday, setIsFirstTimeToday] = useState(true);
  const [feedback, setFeedback] = useState("设定初始能量条，开启这一天。");

  useEffect(() => {
    if (!activeGoal) {
      setEnergy(50);
      setProgress(0);
      setIsFirstTimeToday(true);
      setFeedback("设定初始能量条，开启这一天。");
      return;
    }

    const today = getTodayKey();
    const todayRecord = records.find((record) => record.date === today);

    if (!todayRecord) {
      setEnergy(50);
      setProgress(0);
      setIsFirstTimeToday(true);
      setFeedback("设定初始能量条，开启这一天。");
      return;
    }

    setEnergy(todayRecord.energy);
    setProgress(todayRecord.progress);
    setIsFirstTimeToday(false);
    setFeedback((prev) =>
      prev === "设定初始能量条，开启这一天。"
        ? todayRecord.progress >= 100
          ? "目标达成！"
          : "继续保持节奏。"
        : prev
    );
  }, [activeGoal, records]);

  const handleConfirm = () => {
    if (isFirstTimeToday) {
      let moodText = "平凡的一天也很珍贵。";
      if (energy > 80) {
        moodText = "今天心情还不错嘛！";
      } else if (energy < 30) {
        moodText = "累了可以休息休息。";
      }

      setFeedback(moodText);
      setIsFirstTimeToday(false);
    } else {
      setFeedback(progress >= 100 ? "目标达成！" : "继续保持节奏。");
    }

    addRecord(energy, progress);
  };

  return (
    <div className="space-y-8 rounded-[32px] bg-white p-6 shadow-sm">
      <div>
        <h3 className="mb-1 text-sm text-gray-400">你的目标</h3>
        <p className="text-2xl font-semibold text-slate-900">
          {activeGoal?.title || "未设定目标"}
        </p>
      </div>

      <div className="flex min-h-[100px] items-center justify-center rounded-2xl bg-gray-50 p-6">
        <p className="text-center italic leading-relaxed text-gray-600">{feedback}</p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-medium">今日能量</span>
            <span className="text-sm text-gray-400">{Math.round(energy)}%</span>
          </div>
          <input
            className="w-full cursor-pointer accent-black"
            max={100}
            min={0}
            onChange={(event) => setEnergy(Number(event.target.value))}
            type="range"
            value={energy}
          />
        </div>

        <div
          className={
            isFirstTimeToday
              ? "pointer-events-none opacity-30 transition-opacity duration-300"
              : "transition-opacity duration-500"
          }
        >
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-medium">当前进度</span>
            <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
          </div>
          <input
            className="w-full cursor-pointer accent-black disabled:cursor-not-allowed"
            disabled={isFirstTimeToday}
            max={100}
            min={0}
            onChange={(event) => setProgress(Number(event.target.value))}
            step={2}
            type="range"
            value={progress}
          />
        </div>
      </div>

      <button
        className="w-full rounded-2xl bg-black py-4 font-medium text-white shadow-lg transition-all active:scale-[0.98]"
        onClick={handleConfirm}
        type="button"
      >
        确定
      </button>
    </div>
  );
}

export default PhaseController;
