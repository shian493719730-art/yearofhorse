"use client";

import { useEffect, useMemo, useState } from "react";
import PhaseController from "@/components/PhaseController";
import { calculateStability, getDaysActive, useGoalStore } from "@/lib/store";

export default function HomePage() {
  const hasHydrated = useGoalStore((state) => state.hasHydrated);
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const createGoal = useGoalStore((state) => state.createGoal);
  const clearStore = useGoalStore((state) => state.clearStore);

  const [goalInput, setGoalInput] = useState("");
  const [hour, setHour] = useState(0);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    setHour(new Date().getHours());
    const timer = window.setInterval(() => setHour(new Date().getHours()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const themeClass = useMemo(() => {
    if (hour >= 5 && hour < 11) {
      return "bg-slate-50 text-slate-900";
    }

    if (hour >= 11 && hour < 18) {
      return "bg-slate-200 text-slate-800";
    }

    return "bg-slate-950 text-slate-100";
  }, [hour]);

  if (!hasHydrated) {
    return (
      <main
        className={`flex min-h-screen items-center justify-center p-6 font-mono transition-colors duration-500 ${themeClass}`}
      >
        <p className="text-sm opacity-70">正在同步今天的数据...</p>
      </main>
    );
  }

  if (!activeGoal) {
    return (
      <main
        className={`flex min-h-screen items-center justify-center p-6 font-mono transition-colors duration-500 ${themeClass}`}
      >
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">开启新目标</h1>
            <p className="opacity-80">设定一个你想长期坚持的目标。</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-current/10 bg-white/10 p-6 text-left backdrop-blur-sm">
            <div className="space-y-2">
              <label className="text-sm font-bold opacity-70">我想坚持...</label>
              <input
                className="w-full border-b-2 border-current/30 bg-transparent p-2 text-lg transition-all focus:border-current focus:outline-none"
                onChange={(event) => setGoalInput(event.target.value)}
                placeholder="例如：每天写点东西..."
                type="text"
                value={goalInput}
              />
            </div>

            {createError ? <p className="text-xs text-red-400">{createError}</p> : null}

            <button
              className="w-full rounded-xl border border-current/20 bg-current/10 py-4 font-bold transition-all hover:bg-current/20"
              onClick={() => {
                const title = goalInput.trim();
                if (!title) {
                  return;
                }

                const result = createGoal({ title });
                setCreateError(result.ok ? "" : result.reason ?? "创建失败，请重试。");
              }}
              type="button"
            >
              开始记录
            </button>
          </div>
        </div>
      </main>
    );
  }

  const logs = activeGoal.history;
  const stability = calculateStability(logs);
  const totalFocusTime = logs.reduce((sum, log) => sum + (log.actualDone || 0), 0);
  const daysActive = getDaysActive(activeGoal.startDate);

  let statusText = "刚刚开始";
  if (logs.length > 0) {
    if (stability >= 80) {
      statusText = "状态很棒";
    } else if (stability >= 50) {
      statusText = "稳步前行";
    } else {
      statusText = "需要调整";
    }
  }

  return (
    <main
      className={`flex min-h-screen items-center justify-center p-4 font-mono transition-colors duration-500 ${themeClass}`}
    >
      <div className="w-full max-w-md space-y-6">
        <header className="flex items-end justify-between border-b-2 border-current/10 pb-4">
          <div>
            <p className="mb-1 text-xs font-bold opacity-50">当前目标</p>
            <h1 className="max-w-[220px] truncate text-xl font-bold">{activeGoal.title}</h1>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-bold opacity-50">坚持天数</p>
            <p className="text-xl font-bold">{daysActive} 天</p>
          </div>
        </header>

        <PhaseController />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-2xl border border-current/10 bg-current/5 p-4">
            <p className="mb-1 text-xs opacity-60">专注时长</p>
            <p className="text-2xl font-bold">
              {totalFocusTime.toFixed(1)} <span className="text-sm opacity-50">小时</span>
            </p>
          </div>

          <div className="rounded-2xl border border-current/10 bg-current/5 p-4">
            <p className="mb-1 text-xs opacity-60">今日状态</p>
            <p className="truncate text-xl font-bold">{Math.round(stability)} 分</p>
            <p className="truncate text-xs opacity-50">{statusText}</p>
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            className="rounded-xl border border-current/20 bg-current/10 px-3 py-2 text-xs font-bold transition-all hover:bg-current/20"
            onClick={clearStore}
            type="button"
          >
            重新开始
          </button>
        </div>
      </div>
    </main>
  );
}
