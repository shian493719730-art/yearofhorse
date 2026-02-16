"use client";

import { useEffect, useState } from "react";
import PhaseController from "@/components/PhaseController";
import { useGoalStore, getDaysActive } from "@/lib/store";

export default function HomePage() {
  const store = useGoalStore();
  const { activeGoal, isLoading, isRefetching, fetchLatestGoal, createGoal, updateGoal, aiAnalyzeGoal } = store;
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<any>("dashboard");
  
  const [goalInput, setGoalInput] = useState("");
  const [daysInput, setDaysInput] = useState("21");
  const [options, setOptions] = useState<any[]>([]);
  const [finalUnit, setFinalUnit] = useState("");
  const [finalBase, setFinalBase] = useState(4);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDays, setEditDays] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { setMounted(true); fetchLatestGoal(); }, [fetchLatestGoal]);
  
  useEffect(() => { 
    if (!isLoading && !isRefetching) {
      if (!activeGoal && !isCreating && view === "dashboard") setView("input");
      if (activeGoal && !isCreating && view !== "dashboard") setView("dashboard");
      if (activeGoal) { setEditTitle(activeGoal.title); setEditDays(String(activeGoal.totalDays)); }
    }
  }, [activeGoal, isLoading, isRefetching, view, isCreating]);

  if (!mounted || (isLoading && !activeGoal && !isCreating)) return <div className="min-h-screen bg-[#F5F5F7]" />;

  if (view === "input") return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] font-mono text-slate-800">
      <div className="w-full max-w-lg bg-white p-10 rounded-[44px] shadow-lg border-b-8 border-slate-200 space-y-6">
        <h1 className="text-2xl font-black text-center tracking-tighter">开启新旅程</h1>
        <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="你想坚持什么？" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-center border-2 focus:border-[#007AFF] outline-none" />
        <input type="number" value={daysInput} onChange={(e) => setDaysInput(e.target.value)} placeholder="计划天数" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-center outline-none" />
        <button onClick={async () => { setIsCreating(true); setView("analyzing"); const ops = await aiAnalyzeGoal(goalInput); setOptions(ops); setView("options"); }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black border-b-4 border-blue-800 tracking-widest uppercase text-xs">下一步</button>
      </div>
    </main>
  );

  if (view === "analyzing") return <main className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400">分析中</main>;

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

  const daysActive = getDaysActive(activeGoal?.startDate);
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
            <button onClick={() => { if(isEditing) updateGoal(editTitle, Number(editDays)); setIsEditing(!isEditing); }} className="text-[9px] font-black text-[#007AFF] uppercase mt-2 text-left hover:underline">
              {isEditing ? "保存" : "修改"}
            </button>
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
          </div>
        </header>

        <div className="flex-1 px-8 pb-12 overflow-y-auto"><PhaseController /></div>
      </div>
    </main>
  );
}