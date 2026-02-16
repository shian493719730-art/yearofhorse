"use client";

import { useState } from "react";
import { useGoalStore } from "@/lib/store";

export function GoalCreator() {
  const createGoal = useGoalStore((state: any) => state.createGoal);
  
  const [title, setTitle] = useState("");
  const [days, setDays] = useState(""); 
  
  // 状态：INPUT (输入) -> THINKING (呼吸灯) -> SELECT (选择卡片)
  const [step, setStep] = useState<"INPUT" | "THINKING" | "SELECT">("INPUT");
  const [options, setOptions] = useState<any[]>([]);

  // 1. 开始分析
  const handleAnalyze = async () => {
    if (!title.trim() || !days.trim()) return;
    setStep("THINKING");

    try {
      const res = await fetch('/api/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({ 
          type: "GENERATE_METRICS", 
          payload: { 
            title, 
            days: parseInt(days) 
          } 
        })
      });
      const data = await res.json();
      const parsedOptions = JSON.parse(data.result);
      setOptions(parsedOptions);
      setStep("SELECT");
    } catch (e) {
      await createGoal(title, parseInt(days) || 30, "小时", 1); 
      window.location.reload(); 
    }
  };

  const handleSelect = async (opt: any) => {
    await createGoal(title, parseInt(days), opt.unit, opt.value);
    window.location.reload(); 
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {step === "INPUT" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="想做点什么？"
              className="flex-[2] px-4 py-3 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-slate-300 focus:outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-normal"
            />
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="几天？"
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-slate-300 focus:outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-normal min-w-[80px]"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!title.trim() || !days.trim()}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-[0_4px_0_#0f172a] active:translate-y-1 active:shadow-none"
          >
            开始规划
          </button>
        </div>
      )}

      {step === "THINKING" && (
        <div className="flex justify-center items-center h-[88px]">
          <div className="flex space-x-3">
            <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-pulse"></div>
            <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-pulse [animation-delay:0.4s]"></div>
          </div>
        </div>
      )}

      {step === "SELECT" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">选择一种节奏</h3>
            <button onClick={() => { setStep("INPUT"); setTitle(""); setDays(""); }} className="text-xs text-slate-400 hover:text-slate-600 underline">重置</button>
          </div>
          <div className="grid gap-3">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                className="group relative flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-[20px] hover:border-slate-900 transition-all duration-300 text-left active:scale-[0.98]"
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-slate-900">{opt.value}</span>
                    <span className="text-sm font-bold text-slate-500">{opt.unit}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">每日基准</p>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}