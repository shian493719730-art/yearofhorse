"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { getTodayKey, getTodayLog, useGoalStore, getCurrentPhase, getDaysActive } from "@/lib/store";

const MAX_MULT = 1.5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function PhaseController() {
  const { activeGoal, addDailyLog } = useGoalStore();
  const [mounted, setMounted] = useState(false);
  const todayLog = useMemo(() => getTodayLog(activeGoal), [activeGoal]);

  const [energy, setEnergy] = useState(50);
  const [actualDone, setActualDone] = useState(0);
  const [energyTouched, setEnergyTouched] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [aiComment, setAiComment] = useState("");
  const debounceTimer = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  // 断电记忆：刷新后自动归位
  useEffect(() => {
    if (todayLog && !hasUnsavedChanges) {
      setEnergy(todayLog.energy || 50);
      setActualDone(todayLog.actual_done || 0);
      setEnergyTouched(true);
      setAiComment(todayLog.ai_feedback || "");
      setIsSuccess(true);
    }
  }, [todayLog, hasUnsavedChanges]);

  // AI 智能动态基准
  const dynamicBase = useMemo(() => {
    if (!activeGoal) return 4;
    const totalGoal = (activeGoal.totalDays || 21) * (activeGoal.dailyBase || 4);
    const totalFinished = (activeGoal.logs || []).reduce((sum: number, log: any) => sum + (log.actual_done || 0), 0);
    const daysPassed = getDaysActive(activeGoal.startDate);
    const remainingDays = Math.max(1, (activeGoal.totalDays || 21) - daysPassed + 1);
    return Math.max(0.1, (totalGoal - totalFinished) / remainingDays);
  }, [activeGoal]);

  const safeMaxLimit = dynamicBase * MAX_MULT;
  const recommendedTask = energy <= 50 ? dynamicBase * Math.pow(energy/50, 2.5) : dynamicBase + (dynamicBase*0.2)*Math.pow((energy-50)/50, 0.3);
  const recLinePercent = clamp((recommendedTask / safeMaxLimit) * 100, 0, 100);
  const outputPercent = clamp((actualDone / safeMaxLimit) * 100, 0, 100);

  // ✨ 炫彩门槛：95%
  const isMaxed = energy >= 95 && actualDone >= (safeMaxLimit * 0.95);
  const isGolden = !isMaxed && energy > 80 && actualDone >= recommendedTask;
  const isResilient = energy < 50 && actualDone >= (recommendedTask * 0.85);

  const theme = (() => {
    if (isMaxed) return { main: "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-pink-500 via-red-500 to-yellow-500 animate-pulse", bg: "bg-pink-50", text: "text-pink-600", thumb: "#ec4899", btn: "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-pink-500 via-red-500 to-yellow-500 text-white" };
    if (isGolden) return { main: "bg-yellow-400 shadow-md", bg: "bg-yellow-50", text: "text-yellow-800", thumb: "#facc15", btn: "bg-yellow-400 text-white" };
    if (isResilient) return { main: "bg-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700", thumb: "#4f46e5", btn: "bg-indigo-500 text-white" };
    return { main: "bg-[#007AFF]", bg: "bg-white", text: "text-slate-600", thumb: "#007AFF", btn: "bg-[#007AFF] text-white" };
  })();

  const handleSliderChange = (type: "energy" | "output", value: number) => {
    setHasUnsavedChanges(true); 
    setIsSuccess(false); 
    if (type === "energy") { setEnergy(value); setEnergyTouched(true); }
    else { setActualDone(value); }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          body: JSON.stringify({ title: activeGoal.title, energy: type === "energy" ? value : energy })
        }).then(r => r.json());
        if (res.result && !res.result.includes("系统维护")) setAiComment(res.result);
      } catch (e) {}
    }, 1200);
  };

  if (!mounted || !activeGoal) return null;

  return (
    <div className="space-y-10 pt-4 flex flex-col items-center">
      {/* 🛠️ 核心：滑块按钮变色 CSS */}
      <style jsx global>{`
        .range-thumb::-webkit-slider-thumb { 
          border-color: ${energyTouched ? theme.thumb : '#cbd5e1'} !important; 
          border-width: 4px !important;
          background-color: white !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
          transition: border-color 0.3s ease !important;
        }
      `}</style>
      
      {/* 柱状展示区 */}
      <div className="flex justify-center items-end space-x-14 h-56 relative w-full px-12">
        <div className="flex flex-col items-center space-y-2 w-16">
          <div className="relative w-full h-44 bg-slate-100 rounded-[28px] overflow-hidden border-2">
            <div className={`absolute bottom-0 w-full transition-all duration-500 ${theme.main}`} style={{ height: `${energy}%` }} />
          </div>
          <div className="text-[10px] font-black">{Math.round(energy)}%</div>
        </div>

        <div className={`flex flex-col items-center space-y-2 w-16 ${!energyTouched ? "opacity-30" : ""}`}>
          <div className="relative w-full h-44">
            <div className="absolute w-full h-full z-20 pointer-events-none">
              <div className="absolute w-full transition-all duration-500" style={{ bottom: `${recLinePercent}%` }}>
                <div className={`absolute right-[-14px] transform translate-x-full -translate-y-1/2 text-white text-[9px] px-2 py-1 rounded-lg font-black shadow-lg ${isMaxed ? 'bg-pink-600' : 'bg-[#007AFF]'}`}>
                    {activeGoal.unitName === "小时" ? dynamicBase.toFixed(1) : Math.round(dynamicBase)} {activeGoal.unitName || "小时"}
                </div>
                <div className="w-full border-t-2 border-dashed border-slate-300 opacity-60" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-[28px] overflow-hidden bg-slate-100 border-2 flex flex-col justify-end">
              <div className={`w-full transition-all duration-500 ${theme.main}`} style={{ height: `${outputPercent}%` }} />
            </div>
          </div>
          <div className="text-[10px] font-black">{actualDone.toFixed(1)}</div>
        </div>
      </div>

      {/* 反馈面板 */}
      <div className={`w-full max-w-xs p-6 rounded-[36px] border-2 border-b-4 transition-all text-center mx-auto ${isMaxed ? 'bg-pink-50 border-pink-100' : 'bg-white'}`}>
        <p className={`text-xs font-bold leading-relaxed min-h-[40px] pt-2 ${isMaxed ? 'text-pink-600' : 'text-slate-600'}`}>
          {aiComment && !hasUnsavedChanges ? aiComment : (energy === 50 && actualDone === 0 && !hasUnsavedChanges ? "准备出发：请滑动以上传今日进度" : "保持节奏，水滴石穿。")}
        </p>
      </div>

      {/* 滑块交互区 */}
      <div className="w-full max-w-xs space-y-10">
        <div className="space-y-3">
          <div className="flex justify-between px-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日能量状态</span></div>
          <input type="range" min="0" max="100" step="1" value={energy} onChange={(e) => handleSliderChange("energy", Number(e.target.value))} className="range-thumb w-full h-6 bg-slate-100 rounded-full appearance-none shadow-sm transition-all" />
        </div>
        <div className={`space-y-3 transition-all ${!energyTouched ? "opacity-30 grayscale pointer-events-none" : "opacity-100"}`}>
          <div className="flex justify-between px-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日完成情况</span></div>
          <input type="range" min="0" max={safeMaxLimit} step="0.01" value={actualDone} disabled={!energyTouched} onChange={(e) => handleSliderChange("output", Number(e.target.value))} className="range-thumb w-full h-6 bg-slate-100 rounded-full appearance-none shadow-sm transition-all" />
        </div>
      </div>

      {/* 保存按钮 */}
      <button onClick={async () => { 
          const p = getCurrentPhase(activeGoal.startDate); 
          await addDailyLog({ energy: energy, actualDone: actualDone, date: getTodayKey(), phase: p, aiFeedback: aiComment }); 
          setIsSuccess(true); setHasUnsavedChanges(false); 
        }} 
        disabled={isSuccess && !hasUnsavedChanges} 
        className={`w-full max-w-sm py-5 rounded-[40px] font-black text-sm transition-all border-b-4 ${isSuccess && !hasUnsavedChanges ? "bg-slate-200 border-slate-300 text-slate-400" : theme.btn + " active:translate-y-1 shadow-md border-black/10"}`}>
        {isSuccess && !hasUnsavedChanges ? (isMaxed ? "✨ 巅峰达成" : "✅ 已保存") : "上传今日进度"}
      </button>
    </div>
  );
}