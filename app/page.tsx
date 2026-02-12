"use client";

import { useState } from "react";
import PhaseController from "@/components/PhaseController";
import { getDaysActive, useGoalStore } from "@/lib/store";

export default function HomePage() {
  const hasHydrated = useGoalStore((state) => state.hasHydrated);
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const createGoal = useGoalStore((state) => state.createGoal);

  const [goalInput, setGoalInput] = useState("");
  const [daysInput, setDaysInput] = useState("");
  const [createError, setCreateError] = useState("");

  const handleReset = () => {
    if (window.confirm("【开发调试】确定要清除数据，回到初始状态吗？")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const themeClass =
    "bg-[#F5F5F7] text-slate-900 font-mono antialiased selection:bg-blue-100 selection:text-blue-900";

  if (!hasHydrated) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-6 ${themeClass}`}>
        <p className="text-sm text-slate-400">正在加载...</p>
      </main>
    );
  }

  if (!activeGoal) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-6 ${themeClass}`}>
        <div className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] space-y-8 transition-all duration-500 ease-out">
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">开启新旅程</h1>
            <p className="text-sm text-slate-400 font-medium">设定一个你想长期坚持的目标</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="group space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-blue-500 transition-colors">
                  你的目标
                </label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(event) => setGoalInput(event.target.value)}
                  placeholder="例如：每天阅读..."
                  className="w-full bg-slate-50 border-none p-5 rounded-2xl focus:ring-2 focus:ring-blue-500/20 text-lg placeholder-slate-300 transition-all font-medium text-center outline-none"
                />
              </div>

              <div className="group space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-blue-500 transition-colors">
                  计划坚持 (天)
                </label>
                <input
                  type="number"
                  value={daysInput}
                  onChange={(event) => setDaysInput(event.target.value)}
                  placeholder="例如：21"
                  className="w-full bg-slate-50 border-none p-5 rounded-2xl focus:ring-2 focus:ring-blue-500/20 text-lg placeholder-slate-300 transition-all font-medium text-center outline-none appearance-none"
                />
              </div>
            </div>

            {createError ? <p className="text-xs text-red-500 text-center">{createError}</p> : null}

            <button
              onClick={() => {
                const title = goalInput.trim();
                if (!title) {
                  return;
                }

                const days = Math.max(1, Number.parseInt(daysInput, 10) || 21);
                const result = createGoal(title, days);
                setCreateError(result.ok ? "" : result.reason ?? "创建失败，请稍后重试");
              }}
              className="w-full py-5 bg-slate-900 text-white hover:bg-black rounded-2xl font-bold tracking-wide transition-all shadow-lg shadow-slate-900/20 active:scale-95 text-sm"
              type="button"
            >
              开始记录
            </button>
          </div>
        </div>
      </main>
    );
  }

  const daysActive = getDaysActive(activeGoal.startDate);
  const totalDays = activeGoal.totalDays || 21;

  return (
    <main className={`min-h-screen flex items-center justify-center p-4 ${themeClass} relative`}>
      <button
        onClick={handleReset}
        className="fixed bottom-4 right-4 text-[10px] text-slate-300 hover:text-red-500 transition-colors uppercase font-bold z-50 cursor-pointer"
        type="button"
      >
        [ Reset ]
      </button>

      <div className="w-full max-w-md bg-white rounded-[44px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden border border-white/60 relative">
        <header className="flex justify-between items-center p-8 pb-2 bg-white/80 backdrop-blur-xl z-10 sticky top-0">
          <div className="space-y-1 min-w-0">
            <div className="text-[10px] text-slate-400 font-bold tracking-widest">你的目标</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">
              {activeGoal.title}
            </h1>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">当前进度</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-slate-800 leading-none">{daysActive}</span>
              <span className="text-sm font-bold text-slate-300">/ {totalDays}</span>
            </div>
          </div>
        </header>

        <div className="px-6 pb-8">
          <PhaseController />
        </div>
      </div>
    </main>
  );
}
