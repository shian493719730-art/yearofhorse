"use client";

import { useState } from "react";
import PhaseController from "@/components/PhaseController";
import PixelHorse from "@/components/PixelHorse";
import {
  calculateGoalCompletion,
  getCurrentPhase,
  getTodayKey,
  getTodayLog,
  type DayPhase,
  useGoalStore
} from "@/lib/store";

const phaseBackground: Record<DayPhase, string> = {
  morning: "from-[#f7ef9f] via-[#c8f3a8] to-[#92e59d]",
  afternoon: "from-[#a5e2ff] via-[#7ec8ff] to-[#4f9dff]",
  evening: "from-[#222b74] via-[#171d4f] to-[#0a0f2d]",
  completed: "from-[#1a225e] via-[#101640] to-[#060a1f]"
};

const phaseName: Record<DayPhase, string> = {
  morning: "早安，我的小马",
  afternoon: "不要太累哦",
  evening: "回家休息吧",
  completed: "你长大了"
};

const neobrutalButton =
  "rounded-none border-4 border-black bg-[#f8d248] px-4 py-3 text-[11px] text-black shadow-[4px_4px_0_#000] transition-transform active:translate-y-[2px] active:shadow-[2px_2px_0_#000]";

const getGoalDay = (startDate: string, daysRequired: number) => {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date(`${getTodayKey()}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(today.getTime())) {
    return 1;
  }

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.min(Math.max(diffDays, 1), Math.max(daysRequired, 1));
};

const getEvolutionStage = (completion: number) => {
  if (completion >= 90) {
    return 3;
  }

  if (completion >= 65) {
    return 2;
  }

  if (completion >= 35) {
    return 1;
  }

  return 0;
};

export default function HomePage() {
  const hasHydrated = useGoalStore((state) => state.hasHydrated);
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const createGoal = useGoalStore((state) => state.createGoal);
  const addDailyLog = useGoalStore((state) => state.addDailyLog);
  const clearStore = useGoalStore((state) => state.clearStore);

  const [goalTitle, setGoalTitle] = useState("30分钟专注训练");
  const [daysRequired, setDaysRequired] = useState(21);
  const [createError, setCreateError] = useState("");

  const handleCreateGoal = () => {
    const result = createGoal({
      title: goalTitle,
      daysRequired
    });
    setCreateError(result.ok ? "" : result.reason ?? "创建目标失败");
  };

  if (!hasHydrated) {
    return <main className="p-8 text-sm">正在轻轻整理今天的记忆...</main>;
  }

  if (!activeGoal) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#f7ef9f] via-[#c8f3a8] to-[#92e59d] px-4 py-8 transition-colors duration-700">
        <div className="mx-auto mt-20 w-full max-w-xl rounded-none border-4 border-black bg-[#fff8df] p-6 shadow-[10px_10px_0_#000]">
          <h1 className="text-[13px] leading-relaxed text-black">小马成长记</h1>
          <p className="mt-2 text-[10px] leading-relaxed text-black">
            先许下一个小心愿，马妈妈会一直陪你慢慢跑。
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-[10px] text-black">目标名称</label>
              <input
                className="w-full rounded-none border-4 border-black bg-white px-3 py-2 text-[12px] text-black outline-none"
                onChange={(event) => setGoalTitle(event.target.value)}
                value={goalTitle}
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] text-black">持续天数</label>
              <input
                className="w-full rounded-none border-4 border-black bg-white px-3 py-2 text-[12px] text-black outline-none"
                min={1}
                onChange={(event) =>
                  setDaysRequired(Math.max(1, Number(event.target.value) || 1))
                }
                type="number"
                value={daysRequired}
              />
            </div>
          </div>

          {createError ? (
            <p className="mt-4 text-[10px] text-[#8b1c1c]">{createError}</p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button className={neobrutalButton} onClick={handleCreateGoal} type="button">
              许下一个小心愿
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currentPhase = getCurrentPhase(activeGoal);
  const todayLog = getTodayLog(activeGoal);
  const completion = calculateGoalCompletion(activeGoal);
  const dayCount = getGoalDay(activeGoal.startDate, activeGoal.daysRequired);
  const evolutionStage = getEvolutionStage(completion);
  const horsePhase = currentPhase === "completed" ? "evening" : currentPhase;
  const horseEnergy = todayLog?.energyLevel ?? 65;

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
      className={`min-h-screen bg-gradient-to-b px-4 py-5 transition-colors duration-700 ${phaseBackground[currentPhase]}`}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col">
        <header className="rounded-none border-4 border-black bg-white/85 p-4 shadow-[8px_8px_0_#000] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-black">
              <h1 className="text-[13px] leading-relaxed">小马成长记</h1>
              <p className="text-[10px]">今天的小心愿：{activeGoal.title}</p>
              <p className="text-[10px]">
                陪伴你的第 {dayCount} 天 / 共 {activeGoal.daysRequired} 天
              </p>
              <p className="text-[10px]">我们一起走到了 {completion.toFixed(2)}%</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-none border-4 border-black bg-black px-3 py-2 text-[10px] text-white">
                {phaseName[currentPhase]}
              </span>
              <button
                className="rounded-none border-4 border-black bg-[#ffebe4] px-3 py-2 text-[9px] text-black shadow-[4px_4px_0_#000] transition-transform active:translate-y-[2px] active:shadow-[2px_2px_0_#000]"
                onClick={clearStore}
                type="button"
              >
                重新开始
              </button>
            </div>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-6">
          <PixelHorse
            energy={horseEnergy}
            evolutionStage={evolutionStage}
            phase={horsePhase}
          />
        </section>

        <footer className="pb-4">
          <PhaseController
            defaultBaseTarget={todayLog?.baseTarget ?? 10}
            onCommit={handlePhaseCommit}
            phase={currentPhase}
            todayLog={todayLog}
          />
        </footer>
      </div>
    </main>
  );
}
