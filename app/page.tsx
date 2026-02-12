"use client";

import { useEffect, useState } from "react";
import PhaseController from "@/components/PhaseController";
import { getDaysActive, useGoalStore } from "@/lib/store";

export default function HomePage() {
  const hasHydrated = useGoalStore((state) => state.hasHydrated);
  const activeGoal = useGoalStore((state) => state.activeGoal);
  const createGoal = useGoalStore((state) => state.createGoal);
  const updateGoal = useGoalStore((state) => state.updateGoal);

  const [goalInput, setGoalInput] = useState("");
  const [daysInput, setDaysInput] = useState("");
  const [createError, setCreateError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDays, setEditDays] = useState("");

  const themeClass =
    "bg-[#F5F5F7] text-slate-900 font-mono antialiased selection:bg-blue-100 selection:text-blue-900";

  useEffect(() => {
    if (!activeGoal) {
      return;
    }

    setEditTitle(activeGoal.title);
    setEditDays(String(activeGoal.totalDays || 21));
  }, [activeGoal]);

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
      <div className="w-full max-w-md bg-white rounded-[44px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden border border-white/60 relative">
        <header className="sticky top-0 z-10 flex items-start justify-between bg-white/80 p-8 pb-4 backdrop-blur-xl">
          <div className="mr-4 flex-1 space-y-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                你的目标
              </span>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[10px] font-bold text-blue-400 transition-colors hover:text-blue-600"
                  type="button"
                >
                  [ 修改 ]
                </button>
              ) : null}
            </div>

            {isEditing ? (
              <div className="space-y-2 pt-1">
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="w-full rounded-xl border-none bg-slate-50 px-3 py-2 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">总天数:</span>
                  <input
                    type="number"
                    value={editDays}
                    onChange={(event) => setEditDays(event.target.value)}
                    className="w-16 rounded-md border-none bg-slate-50 px-2 py-1 text-sm font-bold outline-none"
                  />
                </div>
              </div>
            ) : (
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                {activeGoal.title}
              </h1>
            )}
          </div>

          <div className="shrink-0 flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-bold uppercase">当前进度</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-slate-800 leading-none">{daysActive}</span>
              <span className="text-sm font-bold text-slate-300">/ {activeGoal.totalDays || totalDays}</span>
            </div>
          </div>
        </header>

        <div className="px-6 pb-8">
          {isEditing ? (
            <div className="space-y-3 pt-6">
              <button
                onClick={() => {
                  const normalizedTitle = editTitle.trim() || activeGoal.title;
                  const normalizedDays = Math.max(
                    1,
                    Number.parseInt(editDays, 10) || activeGoal.totalDays || 21
                  );
                  updateGoal(normalizedTitle, normalizedDays);
                  setIsEditing(false);
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-[0_6px_0_#0f172a] active:translate-y-1 active:shadow-none transition-all"
                type="button"
              >
                保存修改
              </button>
              <button
                onClick={() => {
                  setEditTitle(activeGoal.title);
                  setEditDays(String(activeGoal.totalDays || 21));
                  setIsEditing(false);
                }}
                className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                type="button"
              >
                取消
              </button>
            </div>
          ) : (
            <PhaseController />
          )}
        </div>
      </div>
    </main>
  );
}
