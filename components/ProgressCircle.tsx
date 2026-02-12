"use client";

import { useId } from "react";
import { useGoalStore } from "@/lib/store";

type ProgressCircleProps = {
  percent: number;
  energy: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getEnergyColor = (value: number) => {
  const safe = clamp(value, 0, 100);

  if (safe <= 20) {
    return "#8B5CF6";
  }

  if (safe <= 40) {
    return "#3B82F6";
  }

  if (safe <= 60) {
    return "#10B981";
  }

  if (safe <= 80) {
    return "#F59E0B";
  }

  return "rainbow";
};

export function ProgressCircle({ percent, energy }: ProgressCircleProps) {
  const stabilityScore = useGoalStore((state) => state.stabilityScore);

  const gradientId = useId().replace(/:/g, "");
  const radius = 66;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const safePercent = clamp(percent, 0, 100);
  const safeEnergy = clamp(energy, 0, 100);
  const safeStability = clamp(stabilityScore, 0, 100);

  const strokeDashoffset = circumference - (safePercent / 100) * circumference;
  const energyColor = getEnergyColor(safeEnergy);
  const isRainbow = energyColor === "rainbow";

  return (
    <div className="relative flex items-center justify-center">
      <svg className="-rotate-90" height={radius * 2} viewBox="0 0 132 132" width={radius * 2}>
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="20%" stopColor="#F59E0B" />
            <stop offset="40%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#3B82F6" />
            <stop offset="80%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>

        <circle
          className={safeStability < 50 ? "text-red-500" : "text-current"}
          cx={radius}
          cy={radius}
          fill="transparent"
          r={normalizedRadius + 8}
          stroke="currentColor"
          strokeDasharray="4 4"
          strokeWidth="1"
          style={{ opacity: 0.3 }}
        />

        <circle
          cx={radius}
          cy={radius}
          fill="transparent"
          r={normalizedRadius}
          stroke="currentColor"
          strokeWidth={stroke}
          style={{ opacity: 0.12 }}
        />

        <circle
          cx={radius}
          cy={radius}
          fill="transparent"
          r={normalizedRadius}
          stroke={isRainbow ? `url(#${gradientId})` : energyColor}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={stroke}
          style={{
            filter: "drop-shadow(0 0 4px rgba(15, 23, 42, 0.2))",
            transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease"
          }}
        />
      </svg>

      <div className="absolute flex flex-col items-center justify-center space-y-1 text-center">
        <span className="font-mono text-3xl font-bold tracking-tight">{Math.round(safePercent)}%</span>
        <span className="border-t border-current/20 pt-1 font-mono text-[10px] opacity-60">
          稳定性: {Math.round(safeStability)}
        </span>
      </div>
    </div>
  );
}

export default ProgressCircle;
