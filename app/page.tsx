"use client";

import { useEffect, useState } from "react";
import PhaseController from "@/components/PhaseController";
import { useGoalStore, getDaysActive } from "@/lib/store";

export default function HomePage() {
  const store = useGoalStore();
  const { 
    activeGoal, isLoading, isRefetching, 
    fetchLatestGoal, createGoal, updateGoal, aiAnalyzeGoal,
    currentUser, login, initUser 
  } = store;

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<any>("dashboard");
  const [handleInput, setHandleInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [daysInput, setDaysInput] = useState("21");
  const [options, setOptions] = useState<any[]>([]);
  const [finalUnit, setFinalUnit] = useState("");
  const [finalBase, setFinalBase] = useState(4);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDays, setEditDays] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 1. 初始化：AI 自动找回身份和同步数据库进度
  useEffect(() => { 
    setMounted(true); 
    const syncData = async () => {
      await initUser();
      await fetchLatestGoal(); 
    };
    syncData();
  }, [initUser, fetchLatestGoal]);
  
  useEffect(() => { 
    if (!isLoading && !isRefetching && currentUser) {
      if (!activeGoal && !isCreating && view === "dashboard") setView("input");
      if (activeGoal && !isCreating && view !== "dashboard") setView("dashboard");
      if (activeGoal) { 
        setEditTitle(activeGoal.title); 
        setEditDays(String(activeGoal.totalDays)); 
      }
    }
  }, [activeGoal, isLoading, isRefetching, view, isCreating, currentUser]);

  if (!mounted) return <div className="min-h-screen bg-[#F5F5F7]" />;

  if (!currentUser) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] font-mono text-slate-800">
        <div className="w-full max-w-lg bg-white p-10 rounded-[44px] shadow-lg border-b-8 border-slate-200 space-y-8">
          <div className="space-y-2 text-center">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Identity identification</span>
            <h1 className="text-2xl font-black tracking-tighter">申领你的代号</h1>
          </div>
          <div className="space-y-4">
            <input value={handleInput} onChange={(e) => setHandleInput(e.target.value)} placeholder="例如：Neo_2026" className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-center border-2 border-transparent focus:border-[#007AFF] outline-none transition-all" />
            <button onClick={() => handleInput && login(handleInput)} disabled={!handleInput} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black border-b-4 border-blue-800 tracking-widest uppercase text-xs active:translate-y-1 transition-all">进入系统</button>
          </div>
        </div>
      </main>
    );
  }

  // 开启新旅程弹窗
  if (view === "input") return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] font-mono text-slate-800">
      <div className="w-full max-w-lg bg-white p-10 rounded-[44px] shadow-lg border-b-8 border-slate-200 space-y-6">
        <h1 className="text-2xl font-black text-center tracking-tighter">开启新旅程</h1>
        <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="请输入目标" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-center border-2 focus:border-[#007AFF] outline-none" />
        <div className="relative flex items-center">
          <input type="number" value={daysInput} onChange={(e) => setDaysInput(e.target.value)} placeholder="计划天数" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-center outline-none" />
          <span className="absolute right-6 font-black text-slate-400">天</span>
        </div>
        <button onClick={async () => { setIsCreating(true); setView("analyzing"); const ops = await aiAnalyzeGoal(goalInput); setOptions(ops); setView("options"); }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black border-b-4 border-blue-800 tracking-widest uppercase text-xs">下一步</button>
      </div>
    </main>
  );

  const daysActive = getDaysActive(activeGoal?.startDate);
  // 需求：字体跟随字数缩放
  const getTitleFontSize = (text: string = "") => {
    if (text.length > 15) return "text-base";
    if (text.length > 10) return "text-lg";
    return "text-2xl";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4 font-mono text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-[44px] shadow-xl flex flex-col border-b-8 border-slate-200 min-h-[720px] overflow-hidden">
        <header className="px-10 py-10 border-b-2 border-slate-50 relative flex justify-between items-start">
          <div className="flex flex-col text-left max-w-[65%] overflow-hidden">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">当前目标</span>
            {isEditing ? (
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-xl font-black border-b-2 border-[#007AFF] outline-none pb-1 mt-1 bg-transparent w-full" />
            ) : (
              <h1 className={`${getTitleFontSize(activeGoal?.title)} font-black tracking-tighter mt-1 transition-all`}>{activeGoal?.title}</h1>
            )}
            <div className="flex space-x-4 items-center mt-2">
              <button onClick={() => { if(isEditing) updateGoal(editTitle, Number(editDays)); setIsEditing(!isEditing); }} className="text-[9px] font-black text-[#007AFF] uppercase hover:underline">{isEditing ? "保存" : "修改"}</button>
              <span className="text-[9px] font-black text-slate-300 uppercase">用户: {currentUser}</span>
            </div>
          </div>
          
          <div className="flex flex-col text-right items-end min-w-[30%]">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">目标天数</span>
            {isEditing ? (
              <div className="flex items-center justify-end space-x-2 mt-1">
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