"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { getTodayKey, getTodayLog, useGoalStore, getCurrentPhase } from "@/lib/store";

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
    if (!todayLog) {
      if (!hasUnsavedChanges) {
        setEnergy(50); setActualDone(0); setEnergyTouched(false); setAiComment(""); setIsSuccess(false);
      }
      return;
    }
    setEnergy(todayLog.energyLevel);
    setActualDone(todayLog.actualDone || 0);
    setEnergyTouched(true);
    setAiComment(todayLog.note || "");
    setHasUnsavedChanges(false);
    // ✨ 如果數據庫中今日已打卡，初始化即進入成功鎖定態
    setIsSuccess(true);
  }, [todayLog]);

  const unit = activeGoal?.unitName || "单位";
  const isDiscrete = ["次", "组", "个", "页"].includes(unit);
  const dailyBase = activeGoal?.dailyBase || 4;
  
  const safeMaxLimit = isDiscrete ? Math.ceil(dailyBase * MAX_MULT) : dailyBase * MAX_MULT;
  const sliderStep = isDiscrete ? 1 : 0.1;

  const calculateRecommended = (e: number) => {
    if (e <= 50) return dailyBase * Math.pow(e / 50, 2.5);
    const ratio = (e - 50) / 50;
    const val = dailyBase + (dailyBase * 0.5 - 0.3) * Math.pow(ratio, 0.3);
    return isDiscrete ? Math.round(val) : val;
  };

  const recommendedTask = calculateRecommended(energy);
  const clampedRec = clamp(recommendedTask, 0.1, safeMaxLimit);
  const displayRecValue = isDiscrete ? Math.round(clampedRec) : Number(clampedRec).toFixed(1);
  
  const outputPercent = clamp((actualDone / safeMaxLimit) * 100, 0, 100);
  const recLinePercent = clamp((clampedRec / safeMaxLimit) * 100, 0, 100);

  const isMaxed = energy >= 100 && actualDone >= safeMaxLimit;
  const isGolden = !isMaxed && energy > 80 && actualDone >= clampedRec;
  const isResilient = energy < 50 && actualDone >= clampedRec * 0.85;

  if (!mounted || !activeGoal) return null;

  const handleSliderChange = (type: "energy" | "output", value: number) => {
    setHasUnsavedChanges(true); 
    // ✨ 只要用戶移動滑塊，就解除鎖定狀態，重新顯示「確認今日狀態」
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
        if (res.result) setAiComment(res.result);
      } catch (e) {}
    }, 1200);
  };

  const theme = (() => {
    if (isMaxed) return { 
      main: "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-pink-500 via-red-500 to-yellow-500 animate-pulse", 
      bg: "bg-pink-50 border-pink-100", text: "text-pink-600", bubble: "bg-pink-600", thumb: "#ec4899",
      btn: "bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-pink-500 via-red-500 to-yellow-500 text-white animate-pulse"
    };
    if (isGolden) return { main: "bg-yellow-400 shadow-lg", bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-800", bubble: "bg-yellow-500", thumb: "#facc15", btn: "bg-yellow-400 text-white" };
    if (isResilient) return { main: "bg-indigo-500 shadow-md", bg: "bg-indigo-50", text: "text-indigo-700", bubble: "bg-indigo-600", thumb: "#4f46e5", btn: "bg-indigo-500 text-white" };
    return { main: "bg-[#007AFF] border-blue-600", bg: "bg-white", text: "text-slate-600", bubble: "bg-[#007AFF]", thumb: "#007AFF", btn: "bg-[#007AFF] text-white" };
  })();

  const getFeedbackText = () => {
    if (aiComment && !hasUnsavedChanges) return aiComment;
    if (energy === 50 && actualDone === 0 && !hasUnsavedChanges) return "准备出发：请滑动确认今日能量状态";
    if (isMaxed) return "完美共振：知行合一的巅峰境界。";
    if (isGolden) return "状态极佳：能量与意志的高度统一。";
    if (isResilient) return "韧性生长：在逆境中守住了基准。";
    if (energy < 50 && !isResilient) return "接纳低谷：今天辛苦了，系統已降低負荷，早點休息。";
    if (energy >= 50 && actualDone >= clampedRec) return "稳定积累：保持这种节奏，水滴石穿。";
    if (energy >= 50 && actualDone < clampedRec) return "接纳波动：能量虽足但产出未滿？沒關係，波動也是能力。";
    return "记录中";
  };

  return (
    <div className="space-y-10 pt-4 flex flex-col items-center">
      <style jsx global>{`.range-thumb::-webkit-slider-thumb { border-color: ${theme.thumb} !important; }`}</style>
      
      <div className="flex justify-center items-end space-x-14 h-56 relative w-full px-12">
        <div className="flex flex-col items-center space-y-2 w-16">
          <div className="relative w-full h-44 bg-slate-100 rounded-[28px] overflow-hidden border-2 border-slate-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)]">
            <div className={`absolute bottom-0 w-full transition-all duration-500 ${theme.main}`} style={{ height: `${energy}%` }} />
          </div>
          <div className="text-[10px] font-black font-mono text-slate-800">{Math.round(energy)}%</div>
        </div>

        <div className={`flex flex-col items-center space-y-2 w-16 ${!energyTouched ? "opacity-30" : ""}`}>
          <div className="relative w-full h-44">
            <div className="absolute w-full h-full z-20 pointer-events-none">
              <div className="absolute w-full transition-all duration-500" style={{ bottom: `${recLinePercent}%` }}>
                <div className={`absolute right-[-14px] transform translate-x-full -translate-y-1/2 text-white text-[9px] px-2 py-1 rounded-lg font-black shadow-lg ${theme.bubble}`}>
                    {displayRecValue} {unit}
                </div>
                <div className="w-full border-t-2 border-dashed border-slate-300 opacity-60" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-[28px] overflow-hidden bg-slate-100 border-2 border-slate-100 flex flex-col justify-end">
              <div className={`w-full transition-all duration-500 ${theme.main}`} style={{ height: `${outputPercent}%` }} />
            </div>
          </div>
          <div className="text-[10px] font-black font-mono text-slate-800">{isDiscrete ? Math.round(actualDone) : Number(actualDone).toFixed(1)}</div>
        </div>
      </div>

      {/* 反饋面板：寬度與滑塊對齊，字體下移 */}
      <div className={`w-full max-w-xs p-6 rounded-[36px] border-2 border-b-4 transition-all duration-300 text-center mx-auto ${theme.bg}`}>
        <p className={`text-xs font-bold leading-relaxed min-h-[40px] pt-2 ${theme.text}`}>{getFeedbackText()}</p>
      </div>

      <div className="w-full max-w-xs space-y-10">
        <div className="space-y-3">
          <div className="flex justify-between px-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日能量状态</span><span className="text-[10px] font-bold text-slate-300">{Math.round(energy)}%</span></div>
          <input type="range" min="0" max="100" value={energy} onChange={(e) => handleSliderChange("energy", Number(e.target.value))} className="range-thumb w-full h-6 bg-slate-100 rounded-full appearance-none border-2 border-slate-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 transition-all shadow-sm" />
        </div>
        <div className={`space-y-3 transition-all ${!energyTouched ? "opacity-30 grayscale pointer-events-none" : "opacity-100"}`}>
          <div className="flex justify-between px-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">实际产出进度</span><span className="text-[10px] font-bold text-slate-300">{isDiscrete ? Math.round(actualDone) : actualDone} {unit}</span></div>
          <input type="range" min="0" max={safeMaxLimit} step={sliderStep} value={actualDone} disabled={!energyTouched} onChange={(e) => handleSliderChange("output", Number(e.target.value))} className="range-thumb w-full h-6 bg-slate-100 rounded-full appearance-none border-2 border-slate-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 transition-all shadow-sm" />
        </div>
      </div>

      {/* ✨ 移除 setTimeout，實現狀態鎖定 */}
      <button onClick={() => { const p = getCurrentPhase(activeGoal.startDate); addDailyLog({ energyLevel: energy, actualDone, date: getTodayKey(), phase: p, note: aiComment }); setIsSuccess(true); }} 
        disabled={isSuccess || !hasUnsavedChanges} 
        className={`w-full max-w-sm py-5 rounded-[40px] font-black text-sm tracking-widest transition-all border-b-4 ${
          isSuccess 
            ? "cursor-default" 
            : "active:translate-y-1 active:border-b-0"
        } ${
          isSuccess 
            ? (isMaxed ? theme.btn + " border-pink-700/30 border-b-0 shadow-none" : "bg-slate-200 border-slate-300 text-slate-400 border-b-0 shadow-none") 
            : hasUnsavedChanges || isMaxed 
              ? theme.btn + " border-black/10 shadow-md" 
              : "bg-slate-200 border-slate-300 text-slate-400"
        }`}>
        {isSuccess ? (isMaxed ? "恭喜" : "已保存") : "确认今日状态"}
      </button>
    </div>
  );
}