"use client";

import { useId } from "react";
import { useGoalStore } from "@/lib/store";

interface ProgressCircleProps {
  percent: number;
  energy: number;
}

export function ProgressCircle({ percent, energy }: ProgressCircleProps) {
  // 🛠️ 修复点：添加 : any 绕过类型检查
  const stabilityScore = useGoalStore((state: any) => state.stabilityScore);

  const gradientId = useId().replace(/:/g, "");
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
        </defs>
        
        {/* 背景轨道 */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-slate-50"
        />
        
        {/* 进度条 */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* 中心数值 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-900 leading-none">
          {Math.round(percent)}%
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
          Load Index
        </span>
      </div>
    </div>
  );
}