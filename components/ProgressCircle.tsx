"use client";

import { useId } from "react";
import { useGoalStore } from "@/lib/store";

type ProgressCircleProps = {
  value: number;
  stability?: number;
  size?: number;
  label?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const getEnergyColor = (value: number) => {
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

const getGlowColor = (value: number) => {
  const color = getEnergyColor(value);

  if (color === "rainbow") {
    return "rgba(236, 72, 153, 0.4)";
  }

  return color;
};

const getStabilityColor = (value: number) => {
  if (value > 80) {
    return "#10B981";
  }

  if (value >= 50) {
    return "#F59E0B";
  }

  return "#EF4444";
};

export function ProgressCircle({
  value,
  stability,
  size = 220,
  label = "Energy"
}: ProgressCircleProps) {
  const storeStability = useGoalStore((state) => state.stabilityScore);

  const safeValue = clamp(value, 0, 100);
  const safeStability = clamp(stability ?? storeStability, 0, 100);
  const gradientId = useId().replace(/:/g, "");

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  const stabilityStrokeWidth = 2;
  const stabilityRadius = Math.max(4, radius - 12);
  const stabilityCircumference = 2 * Math.PI * stabilityRadius;
  const stabilityDashOffset =
    stabilityCircumference - (safeStability / 100) * stabilityCircumference;

  const energyColor = getEnergyColor(safeValue);
  const strokeColor = energyColor === "rainbow" ? `url(#${gradientId})` : energyColor;
  const stabilityColor = getStabilityColor(safeStability);

  return (
    <div className="relative mx-auto flex h-[240px] w-[240px] items-center justify-center">
      <svg
        className="-rotate-90"
        height={size}
        role="img"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="20%" stopColor="#3B82F6" />
            <stop offset="40%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="80%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke="rgba(148, 163, 184, 0.25)"
          strokeWidth={strokeWidth}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{
            filter: `drop-shadow(0 0 4px ${getGlowColor(safeValue)})`,
            transition: "stroke-dashoffset 500ms ease, stroke 500ms ease"
          }}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={stabilityRadius}
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth={stabilityStrokeWidth}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={stabilityRadius}
          stroke={stabilityColor}
          strokeDasharray={stabilityCircumference}
          strokeDashoffset={stabilityDashOffset}
          strokeLinecap="round"
          strokeWidth={stabilityStrokeWidth}
          style={{ transition: "stroke-dashoffset 500ms ease, stroke 500ms ease" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</p>
        <p className="mt-2 text-4xl font-semibold text-slate-900">{safeValue.toFixed(0)}%</p>
        <p className="mt-2 font-mono text-[11px] tracking-[0.12em] text-slate-600">
          System Integrity Score: {safeStability.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}

export default ProgressCircle;
