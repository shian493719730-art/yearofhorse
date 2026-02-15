"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { getCurrentPhase, getTodayKey, getTodayLog, useGoalStore } from "@/lib/store";

const MAX_MULT = 1.5;

// 工具函数
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getToleranceThreshold = (energy: number) => {
  if (energy >= 50) return 0.95;
  return 0.95 - ((50 - energy) / 50) * 0.45;
};

export function PhaseController() {
  const activeGoal = useGoalStore((state: any) => state.activeGoal);
  const addDailyLog = useGoalStore((state: any) => state.addDailyLog);
  const todayLog = useMemo(() => getTodayLog(activeGoal), [activeGoal]);

  const [energy, setEnergy] = useState(50);
  const [actualDone, setActualDone] = useState(0);
  const [energyTouched, setEnergyTouched] = useState(false);
  const [outputTouched, setOutputTouched] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // 🤖 AI 状态
  const [aiComment, setAiComment] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 🎯 动态基准
  const dailyBase = activeGoal?.dailyBase || 4;
  const unit = activeGoal?.unitName || "小时";
  const aiState = activeGoal?.aiLogicState || { pending: false };
  
  // 动态最大值与智能步长
  const maxLimit = dailyBase * MAX_MULT;
  const safeMaxLimit = maxLimit > 0.1 ? maxLimit : 6;
  const sliderStep = safeMaxLimit > 100 ? 5 : 0.1;

  useEffect(() => {
    if (!todayLog) {
      setEnergy(50);
      setActualDone(0);
      setEnergyTouched(false);
      setOutputTouched(false);
      setHasUnsavedChanges(false);
      setAiComment("");
      return;
    }
    setEnergy(todayLog.energyLevel);
    setActualDone(todayLog.actualDone || 0);
    setEnergyTouched(todayLog.energyLevel !== 50 || todayLog.actualDone > 0);
    setOutputTouched(todayLog.actualDone > 0);
    setHasUnsavedChanges(false);
  }, [todayLog]);

  const calculateRecommended = (e: number) => {
    if (e < 50) return dailyBase * Math.pow(e / 50, 2.5);
    if (e < 80) return dailyBase + Math.pow((e - 50) / 30, 0.6) * (dailyBase * 0.5);
    const ratio = (e - 80) / 20;
    return dailyBase * 1.5 - ((1 - ratio) * (dailyBase * 0.25));
  };

  const recommendedTask = calculateRecommended(energy);
  const clampedRec = clamp(recommendedTask, 0.1, safeMaxLimit);
  
  // 🎯 随动数值 (保持5的倍数)
  const displayRecValue = clampedRec < 10 
    ? Math.round(clampedRec * 2) / 2 
    : Math.round(clampedRec / 5) * 5;

  const outputPercent = clamp((actualDone / safeMaxLimit) * 100, 0, 100);
  const recLinePercent = clamp((clampedRec / safeMaxLimit) * 100, 0, 100);
  const toleranceRatio = getToleranceThreshold(energy);

  // 状态判定
  const isResilient = energy < 50 && actualDone >= clampedRec * toleranceRatio;
  const isMaxed = energy >= 100 && outputPercent >= 98; // 稍微放宽一点点判定，防止精度问题导致不满
  const isGolden = !isMaxed && energy > 80 && actualDone >= clampedRec;

  const handleSliderChange = (type: "energy" | "output", value: number) => {
    setHasUnsavedChanges(true);
    setIsSuccess(false);
    if (type === "energy") {
      setEnergy(value);
      setEnergyTouched(true);
    } else {
      setActualDone(value);
      setOutputTouched(true);
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const currentEnergy = type === "energy" ? value : energy;
      const currentFeedback = getFeedback(currentEnergy, type === "output" ? value : actualDone);
      try {
        const res = await fetch('/api/ai-feedback', {
          method: 'POST',
          body: JSON.stringify({ type: "LIVE_COMMENT", payload: { title: currentFeedback.title, energy: currentEnergy } })
        }).then(r => r.json());
        if (res.result) setAiComment(res.result);
      } catch (e) { console.error(e); }
    }, 1000);
  };

  // 样式逻辑 (使用 inline style 解决 Tailwind 复杂渐变报错问题，同时确保视觉效果)
  const getBarStyle = (type: "energy" | "output") => {
    if (isMaxed) return {}; // Maxed 状态走 style 属性
    if (isGolden) return "bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse border-b-4 border-yellow-600";
    if (type === "energy") return "bg-purple-500 border-purple-700 border-b-4";
    if (!energyTouched) return "bg-slate-200 border-slate-300 border-b-4";
    return "bg-blue-500 border-blue-700 border-b-4";
  };

  // 专门处理 Maxed 状态的内联样式
  const getMaxedStyle = () => {
    if (isMaxed) {
      return {
        background: "conic-gradient(at top, #ec4899, #ef4444, #eab308)",
        boxShadow: "0 0 30px rgba(236, 72, 153, 0.6)",
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        height: "100%" // 🛠️ 强制拉满
      };
    }
    return {};
  };

  const getFeedback = (e = energy, a = actualDone) => {
    const rec = calculateRecommended(e);
    const tol = getToleranceThreshold(e);
    const cRec = clamp(rec, 0.1, safeMaxLimit);
    const _isResilient = e < 50 && a >= cRec * tol;
    
    if (e === 50 && a === 0 && !hasUnsavedChanges) return { title: "准备出发", text: "请滑动下侧图标确认今日能量状态", bg: "bg-slate-50 text-slate-600 border-slate-200" };
    if (energyTouched && !outputTouched) {
      if (e < 40) return { title: "能量低", text: "累了可以休息休息，不用勉强。", bg: "bg-slate-50 text-slate-600 border-slate-200" };
      if (e <= 75) return { title: "平稳", text: "平凡的一天也很珍贵。", bg: "bg-blue-50 text-blue-900 border-blue-200" };
      return { title: "能量高", text: "今天心情还不错嘛！感觉能做很多事。", bg: "bg-yellow-50 text-yellow-900 border-yellow-200" };
    }
    if (isMaxed) return { title: "完美共振", text: "不可思议的状态！知行合一的最高境界。", bg: "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-900 border-purple-200" };
    if (isGolden) return { title: "状态极佳", text: "能量充沛，且不仅是空想。太强了。", bg: "bg-yellow-50 text-yellow-900 border-yellow-200" };
    if (_isResilient) return { title: "韧性生长", text: "你把状态拉回来了。在低谷期能做到这样，比满分更珍贵。", bg: "bg-purple-50 text-purple-900 border-purple-200" };
    if (e < 50 && !_isResilient) return { title: "允许低谷", text: "今天确实不容易。系统已自动降低负荷，好好休息。", bg: "bg-slate-50 text-slate-600 border-slate-200" };
    if (e >= 50 && a >= cRec) return { title: "稳定积累", text: "保持这种节奏。水滴石穿的力量，往往是无声的。", bg: "bg-blue-50 text-blue-900 border-blue-200" };
    if (e >= 50 && a < cRec) return { title: "接纳波动", text: "能量充足但产出未满？没关系，接受波动也是一种能力。", bg: "bg-orange-50 text-orange-900 border-orange-200" };

    return { title: "记录中", text: "请滑动下侧图标确认今日能量状态", bg: "bg-slate-50 text-slate-600 border-slate-200" };
  };

  const feedback = getFeedback();
  // 底部只显示数值，不显示 / 目标
  const actualDoneDisplay = safeMaxLimit > 100 ? Math.round(actualDone) : Number(actualDone).toFixed(1);

  const handleSave = async () => {
    if (!activeGoal) return;
    const phase = activeGoal.startDate ? getCurrentPhase(activeGoal.startDate) : 1;
    const commitPhase = phase === 3 ? "evening" : String(phase);
    const success = await addDailyLog({
      date: getTodayKey(),
      phase: commitPhase,
      energyLevel: clamp(Math.round(energy), 0, 100),
      baseTarget: dailyBase, 
      actualDone: Math.max(0, actualDone),
      note: aiComment || feedback.text 
    });
    if (success) {
      setHasUnsavedChanges(false);
      if (isMaxed) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      }
    }
  };

  // 🛠️ 恢复原版按钮逻辑
  const getButtonClass = () => {
    if (isSuccess) return "bg-gradient-to-r from-pink-500 to-yellow-500 text-white shadow-[0_6px_0_#be185d] scale-105 cursor-default pointer-events-none";
    if (!hasUnsavedChanges) return "bg-slate-200 text-slate-400 shadow-none cursor-default";
    
    // 有改动时的状态
    if (isMaxed) return "bg-pink-500 text-white shadow-[0_6px_0_#be185d]";
    if (isGolden) return "bg-yellow-400 text-yellow-900 shadow-[0_6px_0_#ca8a04]"; // 恢复金色
    return "bg-slate-900 text-white shadow-[0_6px_0_#0f172a]";
  };

  return (
    <>
      {isMaxed && <div aria-hidden className="pointer-events-none fixed inset-0 z-40 border-4 border-fuchsia-300/50 animate-pulse" />}

      <section className={`space-y-10 pt-4 transition-all duration-500 ${isMaxed ? "scale-[1.02]" : ""}`}>
        
        {/* 协商弹窗 */}
        {aiState.pending && (
          <div className="mx-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex justify-between items-center animate-in fade-in slide-in-from-top-4">
            <p className="text-sm font-bold text-orange-900">{aiState.text}</p>
            <button className="px-3 py-1 bg-orange-200 text-orange-900 rounded-lg text-xs font-bold active:scale-95">接受</button>
          </div>
        )}

        <div className="flex justify-center items-end space-x-12 h-64 select-none px-4 pb-4">
          <div className="group flex flex-col items-center space-y-3 w-24">
            <div className="relative w-full h-48 bg-slate-100 rounded-[24px] overflow-hidden border-2 border-slate-100">
              <div
                className={`absolute bottom-0 w-full transition-all duration-500 ease-out rounded-[20px] ${typeof getBarStyle("energy") === 'string' ? getBarStyle("energy") : ''}`}
                style={{ height: `${energy}%`, ...(isMaxed ? getMaxedStyle() : {}) }}
              />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">能量</div>
              <div className={`text-xl font-bold font-mono ${isMaxed ? "text-pink-500" : isGolden ? "text-yellow-500" : "text-purple-500"}`}>
                {Math.round(energy)}%
              </div>
            </div>
          </div>

          <div className={`group flex flex-col items-center space-y-3 w-24 transition-opacity duration-300 ${!energyTouched ? "opacity-50 grayscale" : "opacity-100"}`}>
            <div className="relative w-full h-48 bg-slate-100 rounded-[24px] border-2 border-slate-100 overflow-visible">
              
              {/* 🎯 随动推荐标识 Label */}
              <div className="absolute w-full z-20 transition-all duration-500" style={{ bottom: `${recLinePercent}%` }}>
                <div className="absolute right-[-8px] transform translate-x-full -translate-y-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md shadow-lg flex items-center whitespace-nowrap">
                   <span className="font-bold font-mono text-yellow-400">{displayRecValue}{unit}</span>
                   <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[4px] border-r-slate-800" />
                </div>
                <div className="w-full border-t-2 border-dashed border-slate-400 opacity-60" />
              </div>

              <div
                className={`absolute bottom-0 w-full transition-all duration-500 ease-out rounded-[20px] ${typeof getBarStyle("output") === 'string' ? getBarStyle("output") : ''}`}
                // 🛠️ 这里确保 Maxed 状态下高度为 100% 且使用渐变
                style={isMaxed ? { height: '100%', ...getMaxedStyle() } : { height: `${outputPercent}%` }}
              />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">进度</div>
              <div className={`text-xl font-bold font-mono whitespace-nowrap ${isMaxed ? "text-pink-500" : isGolden ? "text-yellow-500" : "text-blue-500"}`}>
                {/* 恢复只显示数值 */}
                {actualDoneDisplay}{unit}
              </div>
            </div>
          </div>
        </div>

        <div className={`mx-4 p-6 rounded-[24px] transition-all duration-300 border-2 ${feedback.bg} relative overflow-hidden`}>
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">{feedback.title}</h3>
            <p className="text-sm font-bold leading-relaxed">{aiComment || feedback.text}</p>
          </div>
          {isMaxed && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
        </div>

        <div className="space-y-8 px-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider"><span>有点累</span><span>精力充沛</span></div>
            <input type="range" min="0" max="100" value={energy} onChange={(e) => handleSliderChange("energy", Number(e.target.value))} className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none border-2 border-slate-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_0px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-200" />
          </div>

          <div className={`space-y-3 transition-opacity duration-300 ${!energyTouched ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider"><span>没做</span><span>超额完成</span></div>
            <input type="range" min="0" max={safeMaxLimit} step={sliderStep} value={actualDone} disabled={!energyTouched} onChange={(e) => handleSliderChange("output", Number(e.target.value))} className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none border-2 border-slate-100 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_4px_0px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-200" />
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSuccess || !hasUnsavedChanges} 
          className={`w-full py-4 rounded-[20px] font-bold text-base tracking-wide transition-all duration-300 active:translate-y-1 active:shadow-none ${getButtonClass()}`}
        >
          {isSuccess ? "恭喜！！！" : hasUnsavedChanges ? (isMaxed ? "记录高光时刻！" : "确定") : "已同步"}
        </button>
      </section>
    </>
  );
}

export default PhaseController;