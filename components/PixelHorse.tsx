"use client";

import type { DayPhase } from "@/lib/store";

type PixelHorsePhase = Exclude<DayPhase, "completed">;

type PixelHorseProps = {
  phase: PixelHorsePhase;
  energy: number;
  evolutionStage: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getPhasePalette = (phase: PixelHorsePhase) => {
  if (phase === "morning") {
    return {
      panel: "#F4D7A7",
      body: "#A46A3D",
      mane: "#6E4021",
      aura: "shadow-[0_0_0_4px_#000,0_0_0_10px_rgba(245,201,110,0.35)]"
    };
  }

  if (phase === "afternoon") {
    return {
      panel: "#A4C7ED",
      body: "#2A2A2A",
      mane: "#0E0E0E",
      aura: "shadow-[0_0_0_4px_#000,0_0_0_12px_rgba(63,126,234,0.35)]"
    };
  }

  return {
    panel: "#28306B",
    body: "#1A2150",
    mane: "#090E24",
    aura: "shadow-[0_0_0_4px_#000,0_0_0_12px_rgba(158,180,255,0.35)]"
  };
};

const getAnimationDuration = (phase: PixelHorsePhase, energy: number) => {
  const safeEnergy = clamp(energy, 0, 100);

  if (phase === "afternoon") {
    const duration = 1.45 - safeEnergy * 0.0085;
    return `${duration.toFixed(2)}s`;
  }

  if (phase === "morning") {
    return "1.5s";
  }

  return "2.2s";
};

const stageLabels = ["Foal", "Runner", "Charger", "Mythic"];

export function PixelHorse({ phase, energy, evolutionStage }: PixelHorseProps) {
  const palette = getPhasePalette(phase);
  const safeEnergy = clamp(Math.floor(energy), 0, 100);
  const safeStage = clamp(Math.floor(evolutionStage), 0, stageLabels.length - 1);
  const duration = getAnimationDuration(phase, safeEnergy);

  return (
    <div className="w-full max-w-lg rounded-none border-4 border-black bg-white p-4 shadow-[8px_8px_0_#000]">
      <div
        className={`relative h-[320px] w-full border-4 border-black ${palette.aura}`}
        style={{ backgroundColor: palette.panel }}
      >
        <div className="absolute left-3 top-2 text-[9px] text-black">
          PHASE: {phase.toUpperCase()}
        </div>
        <div className="absolute right-3 top-2 text-[9px] text-black">
          STAGE: {stageLabels[safeStage]}
        </div>

        <div className="absolute inset-0">
          <div className="absolute left-2 top-16 h-1 w-1 bg-black/20" />
          <div className="absolute right-10 top-20 h-1 w-1 bg-black/20" />
          <div className="absolute right-16 top-12 h-1 w-1 bg-black/20" />
        </div>

        <div
          className={`absolute left-1/2 top-1/2 h-[170px] w-[190px] -translate-x-1/2 -translate-y-1/2 ${
            phase === "evening" ? "" : "animate-horse-bounce"
          }`}
          style={{ animationDuration: duration }}
        >
          <div
            className="absolute left-8 top-[78px] h-[52px] w-[94px] border-4 border-black"
            style={{ backgroundColor: palette.body }}
          />
          <div
            className="absolute left-[90px] top-[50px] h-[40px] w-[52px] border-4 border-black"
            style={{ backgroundColor: palette.body }}
          />
          <div
            className="absolute left-[104px] top-[42px] h-[8px] w-[8px] border-2 border-black bg-white"
            aria-hidden
          />
          <div
            className="absolute left-[16px] top-[88px] h-[22px] w-[16px] border-4 border-black"
            style={{ backgroundColor: palette.mane }}
          />
          <div
            className="absolute left-[24px] top-[126px] h-[30px] w-[16px] border-4 border-black"
            style={{ backgroundColor: palette.mane }}
          />
          <div
            className="absolute left-[64px] top-[126px] h-[32px] w-[16px] border-4 border-black"
            style={{ backgroundColor: palette.mane }}
          />
          <div
            className="absolute left-[98px] top-[126px] h-[32px] w-[16px] border-4 border-black"
            style={{ backgroundColor: palette.mane }}
          />
        </div>

        {phase === "evening" ? (
          <div className="absolute left-1/2 top-[72px] -translate-x-1/2 text-[10px] text-[#dbe2ff]">
            z z z
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-4 border-black bg-[#fff7dc] px-3 py-2 text-[9px] text-black">
        <span>ENERGY {safeEnergy}</span>
        <span>ANIM {duration}</span>
      </div>
    </div>
  );
}

export default PixelHorse;
