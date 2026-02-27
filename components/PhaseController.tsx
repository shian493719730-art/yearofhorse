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

  useEffect(() => {
    if (todayLog && !hasUnsavedChanges) {
      setEnergy(todayLog.energyLevel);
      setActualDone(todayLog.actualDone || 0);
      setEnergyTouched(true);
      setAiComment(todayLog.note || "");
      setIsSuccess(true);
      setHasUnsavedChanges(false);
    }
  }, [todayLog, hasUnsavedChanges]);

  const dynamicBase = useMemo(() => {
    if (!activeGoal) return 4;
    const totalGoal = (activeGoal.totalDays || 21) * (activeGoal.dailyBase || 4);
    const totalFinished = (activeGoal.logs || []).reduce((sum: number, log: any) => sum + (log.actualDone || 0), 0);
    const daysPassed = getDaysActive(activeGoal.startDate);
    const remainingDays = Math.max(1, (activeGoal.totalDays || 21) - daysPassed + 1);
    return Math.max(0.1, (totalGoal - totalFinished) / remainingDays);
  }, [activeGoal]);

  const safeMaxLimit = dynamicBase * MAX_MULT;
  const isMaxed = energy >= 95 && actualDone >= (safeMaxLimit * 0.95);
  const theme = (() => {
    if (isMaxed) return { thumb: "#ec4899", main: "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-pink-500 via-red-500 to-yellow-500 animate-pulse" };
    if (energy > 80) return { thumb: "#facc15", main: "bg-yellow-400" };
    return { thumb: "#007AFF", main: "bg-[#007AFF]" };
  })();

  const handleSliderChange = (type: "energy" | "output", value: number) => {
    setHasUnsavedChanges(true); setIsSuccess(false); 
    if (type === "energy") { setEnergy(value); setEnergyTouched(true); }
    else { setActualDone(value); }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/generate', { method: 'POST', body: JSON.stringify({ title: activeGoal.title, energy: type === "energy" ? value : energy }) }).then(r => r.json());
        if (res.result) setAiComment(res.result);
      } catch (e) {}
    }, 1200);
  };

  if (!mounted || !activeGoal) return null;

  return (
    <div className="space-y-10 pt-4 flex flex-col items-center">
      <style jsx global>{`
        .range-thumb::-webkit-slider-thumb { 
          appearance: none; width: 32px !important; height: 32px !important;
          border-radius: 50% !important; border: 4px solid ${energyTouched ? theme.thumb : '#cbd5e1'} !important; 
          background-color: white !important; transition: border-color 0.3s ease;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer;
        }
      `}</style>
      
      <div className="flex justify-center items-end space-x-14 h-56 relative w-full px-12">
        <div className="flex flex-col items-center space-y-2 w-16">
          <div className="relative w-full h-44 bg-slate-100 rounded-[28px] overflow-hidden border-2 border-slate-100">
            <div className={`absolute bottom-0 w-full transition-all duration-500 ${theme.main}`} style={{ height: `${energy}%` }} />
          </div>
          <div className="text-[10px] font-black">{Math.round(energy)}%</div>
        </div>
        <div className={`flex flex-col items-center space-y-2 w-16 ${!energyTouched ? "opacity-30" : ""}`}>
          <div className="relative w-full h-44 bg-slate-100 rounded-[28px] overflow-hidden border-2 flex flex-col justify-end">
            <div className={`w-full transition-all duration-500 ${theme.main}`} style={{ height: `${(actualDone/safeMaxLimit)*100}%` }} />
          </div>
          <div className="text-[10px] font-black">{actualDone.toFixed(1)}</div>
        </div>
      </div>

      <div className={`w-full max-w-xs p-6 rounded-[36px] border-2 border-b-4 text-center mx-auto ${isMaxed ? 'bg-pink-50 border-pink-100' : 'bg-white'}`}>
        <p className={`text-xs font-bold leading-relaxed min-h-[40px] pt-2 ${isMaxed ? 'text-pink-600' : 'text-slate-600'}`}>
          {aiComment && !hasUnsavedChanges ? aiComment : "保持节奏，水滴石穿。"}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-10">
        <div className="space-y-3">
          <input type="range" min="0" max="100" step="1" value={energy} onChange={(e) => handleSliderChange("energy", Number(e.target.value))} className="range-thumb w-full h-8 bg-slate-100 rounded-full appearance-none" />
        </div>
        <div className={`space-y-3 transition-all ${!energyTouched ? "opacity-30 grayscale pointer-events-none" : ""}`}>
          <input type="range" min="0" max={safeMaxLimit} step="0.1" value={actualDone} disabled={!energyTouched} onChange={(e) => handleSliderChange("output", Number(e.target.value))} className="range-thumb w-full h-8 bg-slate-100 rounded-full appearance-none" />
        </div>
      </div>

      <button onClick={async () => { 
          const p = getCurrentPhase(activeGoal.startDate); 
          await addDailyLog({ energyLevel: energy, actualDone, date: getTodayKey(), phase: p, note: aiComment }); 
          setIsSuccess(true); setHasUnsavedChanges(false);
        }} 
        disabled={isSuccess && !hasUnsavedChanges} 
        className={`w-full max-w-sm py-5 rounded-[40px] font-black text-sm transition-all border-b-4 ${isSuccess && !hasUnsavedChanges ? "bg-slate-200 text-slate-400" : "bg-[#007AFF] text-white active:translate-y-1 shadow-md border-black/10"}`}>
        {isSuccess && !hasUnsavedChanges ? "✅ 已保存" : "上传今日进度"}
      </button>
    </div>
  );
}