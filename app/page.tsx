"use client";

import { useEffect, useState } from "react";
import PhaseController from "@/components/PhaseController";
import { useGoalStore, getDaysActive } from "@/lib/store";

export default function HomePage() {
  const store = useGoalStore();
  const { 
    activeGoal, isLoading, isRefetching, 
    fetchLatestGoal, fetchArchivedGoals, createGoal, updateGoal, aiAnalyzeGoal, completeActiveGoal,
    archivedGoals, isArchiveLoading,
    currentUser, login, initUser, savedHandleHint // 从 store 引入新功能
  } = store;

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<any>("dashboard");
  
  const [handleInput, setHandleInput] = useState(""); // 登录输入框
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [daysInput, setDaysInput] = useState("21");
  const [options, setOptions] = useState<any[]>([]);
  const [finalUnit, setFinalUnit] = useState("");
  const [finalBase, setFinalBase] = useState(4);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDays, setEditDays] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const daysActive = getDaysActive(activeGoal?.startDate);
  const totalDays = Number(activeGoal?.totalDays || 0);
  const isGoalFinished = Boolean(activeGoal && totalDays > 0 && daysActive > totalDays);
  const formatDate = (value: string) => value ? value.slice(0, 10).replace(/-/g, ".") : "--";

  // 1. 初始化用户身份
  useEffect(() => { 
    setMounted(true); 
    initUser(); // 先找我是谁
  }, [initUser]);

  useEffect(() => {
    if (savedHandleHint && !handleInput) setHandleInput(savedHandleHint);
  }, [savedHandleHint, handleInput]);

  useEffect(() => {
    if (view !== "dashboard") setIsArchiveOpen(false);
  }, [view]);

  const handleLogin = async () => {
    if (!handleInput.trim() || !pinInput.trim() || isAuthenticating) return;

    setAuthError("");
    setIsAuthenticating(true);
    const result = await login(handleInput, pinInput);
    setIsAuthenticating(false);

    if (!result?.ok) {
      setAuthError(result?.message || "身份校验失败");
      return;
    }

    setPinInput("");
  };
  
  // 2. 状态机：控制什么时候该显示什么界面
  useEffect(() => { 
    if (!isLoading && !isRefetching && currentUser) {
      if (!activeGoal && !isCreating && view === "dashboard") setView("input");
      if (activeGoal && isGoalFinished && !isCreating && view !== "settlement") setView("settlement");
      if (activeGoal && !isGoalFinished && !isCreating && view !== "dashboard") setView("dashboard");
      if (activeGoal) { 
        setEditTitle(activeGoal.title); 
        setEditDays(String(activeGoal.totalDays)); 
      }
    }
  }, [activeGoal, isLoading, isRefetching, view, isCreating, currentUser, isGoalFinished]);

  if (!mounted) return <div className="min-h-screen bg-[#F5F5F7]" />;

  // 🚪 场景 A：身份申领（登录页）
  if (!currentUser) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] font-mono text-slate-800">
        <div className="w-full max-w-lg bg-white p-10 rounded-[44px] shadow-lg border-b-8 border-slate-200 space-y-8">
          <div className="space-y-2 text-center">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Identity identification</span>
            <h1 className="text-2xl font-black tracking-tighter">注册姓名与密码</h1>
          </div>
          <div className="space-y-4">
            <input 
              value={handleInput} 
              onChange={(e) => { setHandleInput(e.target.value); setAuthError(""); }} 
              placeholder="例如：Neo_2026" 
              className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-center border-2 border-transparent focus:border-[#007AFF] outline-none transition-all" 
            />
            <input
              type="password"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setAuthError(""); }}
              placeholder="请注册或者输入密码"
              className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-center border-2 border-transparent focus:border-[#007AFF] outline-none transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button 
              onClick={handleLogin} 
              disabled={!handleInput.trim() || !pinInput.trim() || isAuthenticating}
              className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black border-b-4 border-blue-800 tracking-widest uppercase text-xs active:translate-y-1 disabled:opacity-50 transition-all"
            >
              {isAuthenticating ? "验证中" : "进入系统"}
            </button>
          </div>
          {authError ? (
            <p className="text-[10px] text-center text-red-500 font-bold">{authError}</p>
          ) : null}
          <p className="text-[9px] text-slate-400 text-center leading-relaxed px-6">
            * 首次输入会自动创建身份；以后请使用同一代号和口令进入。<br/>口令至少 4 位，只保存在你自己的设备会话中。
          </p>
        </div>
      </main>
    );
  }

  // 加载中状态（已登录但在抓取数据）
  if (isLoading && !activeGoal && !isCreating) {
    return <main className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400">加载逻辑中...</main>;
  }

  // 🏠 场景 B：输入目标
  if (view === "input") return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] font-mono text-slate-800">
      <div className="w-full max-w-lg bg-white p-10 rounded-[44px] shadow-lg border-b-8 border-slate-200 space-y-6">
        <h1 className="text-2xl font-black text-center tracking-tighter">开启新旅程</h1>
        <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="你想坚持什么？" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-center border-2 focus:border-[#007AFF] outline-none" />
        <div className="w-full bg-slate-50 rounded-2xl flex items-center justify-center px-5 border-2 border-transparent focus-within:border-[#007AFF] transition-all">
          <span className="font-black text-slate-500 mr-3">天</span>
          <input type="number" value={daysInput} onChange={(e) => setDaysInput(e.target.value)} placeholder="计划天数" className="w-full bg-transparent p-5 font-bold text-center outline-none" />
        </div>
        <button onClick={async () => { setIsCreating(true); setView("analyzing"); const ops = await aiAnalyzeGoal(goalInput); setOptions(ops); setView("options"); }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black border-b-4 border-blue-800 tracking-widest uppercase text-xs">下一步</button>
      </div>
    </main>
  );

  // 场景 C：分析中
  if (view === "analyzing") return <main className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400 font-mono">逻辑解构中...</main>;

  // 场景 D：选项分歧
  if (view === "options") return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] font-mono text-slate-800 text-center">
      <div className="w-full max-w-3xl space-y-10">
        <h2 className="text-2xl font-black tracking-tighter">选一个方向</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((opt: any) => (
            <button key={opt.id} onClick={() => { setFinalUnit(opt.unit); setFinalBase(opt.base); setView("confirm"); }} 
              className="group relative bg-white h-64 p-8 rounded-[40px] border-2 border-slate-100 border-b-8 hover:border-[#007AFF] active:translate-y-1 transition-all text-center flex flex-col justify-between shadow-sm">
              <div className="absolute top-6 left-6 font-black text-[10px] text-slate-300 uppercase">{opt.label}</div>
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="text-5xl font-black text-slate-900 tracking-tighter">{opt.base}</div>
                <div className="text-xs font-bold text-slate-400 mt-2">以「{opt.unit}」计</div>
              </div>
              <div className="text-[10px] font-bold text-slate-400 leading-tight">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );

  // 场景 E：最终确认
  if (view === "confirm") return (
    <main className="min-h-screen flex items-center justify-center p-6 font-mono text-slate-800">
      <div className="w-full max-w-lg bg-white p-10 rounded-[44px] shadow-lg border-b-8 border-slate-200 space-y-6">
        <h2 className="font-black text-xl text-center">确认细节</h2>
        <div className="bg-slate-50 p-8 rounded-3xl space-y-6 font-bold border-2 border-slate-100">
          <div className="flex justify-between items-center"><span>计量单位</span><input value={finalUnit} onChange={(e) => setFinalUnit(e.target.value)} className="w-24 text-right bg-transparent outline-none text-[#007AFF] border-b-2 border-[#007AFF] pb-1" /></div>
          <div className="flex justify-between items-center"><span>每日基准</span><input type="number" value={finalBase} onChange={(e) => setFinalBase(Number(e.target.value))} className="w-24 text-right bg-transparent outline-none text-[#007AFF] border-b-2 border-[#007AFF] pb-1" /></div>
        </div>
        <button onClick={async () => { setView("dashboard"); await createGoal(goalInput, Number(daysInput), finalUnit, finalBase); setIsCreating(false); }} className="w-full py-5 bg-green-500 text-white rounded-2xl font-black border-b-4 border-green-800 tracking-widest uppercase text-xs">确认开启</button>
      </div>
    </main>
  );

  // 场景 F：任务结算
  if (view === "settlement" && activeGoal) {
    const logs = activeGoal.logs || [];
    const outputTotal = logs.reduce((sum: number, log: any) => sum + Number(log.actualDone || 0), 0);
    const avgEnergy = logs.length ? Math.round(logs.reduce((sum: number, log: any) => sum + Number(log.energyLevel || 0), 0) / logs.length) : 0;
    const daysOverdue = Math.max(0, daysActive - totalDays);
    const summaryTag = avgEnergy >= 80 ? "高能完赛" : avgEnergy >= 50 ? "稳定完赛" : "韧性完赛";
    const summaryText = daysOverdue > 0
      ? `超出计划 ${daysOverdue} 天仍坚持到底，节奏掌控力很强。`
      : "在计划周期内完成目标，执行力非常稳定。";

    const handleStartNextGoal = async () => {
      if (isCompleting) return;
      setIsCompleting(true);
      const result = await completeActiveGoal();
      setIsCompleting(false);

      if (!result?.ok) {
        alert(result?.message || "结算失败，请稍后重试");
        return;
      }

      setGoalInput("");
      setDaysInput("21");
      setOptions([]);
      setFinalUnit("");
      setFinalBase(4);
      setIsCreating(false);
      setView("input");
    };

    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] font-mono text-slate-800">
        <div className="w-full max-w-lg bg-white p-10 rounded-[44px] shadow-xl border-b-8 border-slate-200 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Run complete</span>
            <h1 className="text-3xl font-black tracking-tighter">任务已结算</h1>
            <p className="text-xs font-bold text-slate-400">{activeGoal.title} · {summaryTag}</p>
          </div>

          <div className="rounded-[34px] border-2 border-slate-100 bg-slate-50/80 p-7 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">计划周期</span>
              <span className="font-black text-slate-700">{totalDays} 天</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">实际投入</span>
              <span className="font-black text-slate-700">{daysActive} 天</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">累计产出</span>
              <span className="font-black text-slate-700">{Number(outputTotal.toFixed(1))} {activeGoal.unitName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">平均能量</span>
              <span className="font-black text-slate-700">{avgEnergy}%</span>
            </div>
          </div>

          <div className="rounded-[30px] bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-slate-100 p-6 text-center">
            <p className="text-sm font-black text-slate-700 leading-relaxed">{summaryText}</p>
          </div>

          <button
            onClick={handleStartNextGoal}
            disabled={isCompleting}
            className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black border-b-4 border-blue-800 tracking-widest uppercase text-xs active:translate-y-1 disabled:opacity-60 transition-all"
          >
            {isCompleting ? "结算中" : "归档并开启新目标"}
          </button>
        </div>
      </main>
    );
  }

  // 🏁 场景 F：主看板
  // 当目标到期后，状态机会自动切到 settlement 视图
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4 font-mono text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-[44px] shadow-xl flex flex-col border-b-8 border-slate-200 min-h-[720px] overflow-hidden">
        
        <header className="px-10 py-10 border-b-2 border-slate-50 relative flex justify-between items-start">
          <div className="flex flex-col text-left max-w-[65%]">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">当前目标</span>
            {isEditing ? (
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-2xl font-black border-b-2 border-[#007AFF] outline-none pb-1 mt-1 bg-transparent w-full" />
            ) : (
              <h1 className="text-2xl font-black tracking-tighter mt-1 truncate">{activeGoal?.title}</h1>
            )}
            <div className="flex space-x-4 items-center mt-2">
              <button onClick={() => { if(isEditing) updateGoal(editTitle, Number(editDays)); setIsEditing(!isEditing); }} className="text-[9px] font-black text-[#007AFF] uppercase hover:underline">
                {isEditing ? "保存" : "修改"}
              </button>
              {/* 显示当前身份，增加归属感 */}
              <span className="text-[9px] font-black text-slate-300 uppercase">用户: {currentUser}</span>
            </div>
          </div>
          
          <div className="flex flex-col text-right items-end min-w-[30%]">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">完成进度</span>
            {isEditing ? (
              <div className="flex items-center justify-end space-x-2 mt-1">
                <span className="text-xs font-bold text-slate-400">总:</span>
                <input type="number" value={editDays} onChange={(e) => setEditDays(e.target.value)} className="w-12 text-center font-black bg-slate-50 rounded-lg p-1 outline-none text-sm border-2 border-slate-100" />
              </div>
            ) : (
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 mt-2">第 {daysActive} / {activeGoal?.totalDays} 天</div>
            )}
            <div className="relative mt-3">
              <button
                onClick={async () => {
                  const next = !isArchiveOpen;
                  setIsArchiveOpen(next);
                  if (next) await fetchArchivedGoals();
                }}
                className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-[#007AFF] transition-colors"
              >
                归档记录
              </button>

              {isArchiveOpen ? (
                <div className="absolute right-0 top-full mt-3 w-72 rounded-[24px] bg-white border-2 border-slate-100 border-b-4 border-slate-200 shadow-xl p-4 space-y-3 z-30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Archive</span>
                    <button
                      onClick={() => setIsArchiveOpen(false)}
                      className="text-[10px] font-black text-slate-400 hover:text-slate-600"
                    >
                      收起
                    </button>
                  </div>

                  {isArchiveLoading ? (
                    <p className="text-[10px] text-slate-400 font-bold py-4 text-center">加载归档中...</p>
                  ) : archivedGoals?.length ? (
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {archivedGoals.map((goal: any) => (
                        <div key={goal.id} className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-3 text-left">
                          <p className="text-xs font-black text-slate-700 truncate">{goal.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-1">
                            {formatDate(goal.start_date)} · {goal.total_days}天 · 打卡{goal.daysLogged}天
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 mt-1">
                            累计 {goal.outputTotal} {goal.unit_name} · 平均能量 {goal.avgEnergy}%
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-bold py-4 text-center">还没有归档目标</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex-1 px-8 pb-12 overflow-y-auto"><PhaseController /></div>
      </div>
    </main>
  );
}
