"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateProgress, type DailyLog, type DayPhase } from "@/lib/store";

type CommitPhase = Exclude<DayPhase, "completed">;

type CommitPayload = {
  phase: CommitPhase;
  energyLevel: number;
  baseTarget: number;
  actualDone: number;
};

type PhaseControllerProps = {
  phase: DayPhase;
  todayLog: DailyLog | null;
  defaultBaseTarget?: number;
  onCommit: (payload: CommitPayload) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buttonClass =
  "rounded-none border-4 border-black bg-[#f7d750] px-4 py-3 text-[11px] text-black shadow-[4px_4px_0_#000] transition-transform active:translate-y-[2px] active:shadow-[2px_2px_0_#000]";

export function PhaseController({
  phase,
  todayLog,
  defaultBaseTarget = 10,
  onCommit
}: PhaseControllerProps) {
  const [energy, setEnergy] = useState<number>(todayLog?.energyLevel ?? 65);
  const [actualDone, setActualDone] = useState<number>(todayLog?.actualDone ?? 0);
  const [baseTarget, setBaseTarget] = useState<number>(
    todayLog?.baseTarget ?? defaultBaseTarget
  );

  const logKey = todayLog
    ? `${todayLog.date}-${todayLog.phase}-${todayLog.energyLevel}-${todayLog.actualDone}-${todayLog.baseTarget}`
    : "no-log";

  useEffect(() => {
    setEnergy(todayLog?.energyLevel ?? 65);
    setActualDone(todayLog?.actualDone ?? 0);
    setBaseTarget(todayLog?.baseTarget ?? defaultBaseTarget);
  }, [defaultBaseTarget, logKey]);

  const previewCompletion = useMemo(
    () => calculateProgress(energy, actualDone, baseTarget),
    [actualDone, baseTarget, energy]
  );

  const adjustedTarget = useMemo(() => {
    const value = baseTarget * (energy / 100 + 0.5);
    return Number(value.toFixed(2));
  }, [baseTarget, energy]);

  const energyFeeling = energy < 50 ? "还有点困" : "元气满满";

  if (phase === "morning") {
    return (
      <div className="w-full rounded-none border-4 border-black bg-[#fff5d8] p-5 shadow-[8px_8px_0_#000]">
        <p className="text-[12px] text-black">早安，我的小马</p>
        <p className="mt-2 text-[10px] text-black">昨晚睡得香吗？</p>
        <div className="mt-4 space-y-2">
          <label className="block text-[10px] text-black">
            今天身上力气多吗？ {energy} ({energyFeeling})
          </label>
          <input
            className="h-4 w-full cursor-pointer accent-black"
            max={100}
            min={0}
            onChange={(event) => setEnergy(Number(event.target.value))}
            type="range"
            value={energy}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button
            className={buttonClass}
            onClick={() =>
              onCommit({
                phase: "morning",
                energyLevel: clamp(energy, 0, 100),
                baseTarget: Math.max(1, baseTarget),
                actualDone: 0
              })
            }
            type="button"
          >
            轻轻出发
          </button>
        </div>
      </div>
    );
  }

  if (phase === "afternoon") {
    return (
      <div className="w-full rounded-none border-4 border-black bg-[#d9ecff] p-5 shadow-[8px_8px_0_#000]">
        <p className="text-[12px] text-black">不要太累哦</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[10px] text-black">走到哪里了？</label>
            <input
              className="mt-2 w-full rounded-none border-4 border-black bg-white px-3 py-2 text-[12px] text-black outline-none"
              min={0}
              onChange={(event) => setActualDone(Math.max(0, Number(event.target.value)))}
              type="number"
              value={actualDone}
            />
          </div>

          <div>
            <label className="block text-[10px] text-black">今天想走几步？</label>
            <input
              className="mt-2 w-full rounded-none border-4 border-black bg-white px-3 py-2 text-[12px] text-black outline-none"
              min={1}
              onChange={(event) => setBaseTarget(Math.max(1, Number(event.target.value)))}
              type="number"
              value={baseTarget}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-[10px] text-black">
            是不是有点累了？ 能量: {energy}
          </label>
          <input
            className="h-4 w-full cursor-pointer accent-black"
            max={100}
            min={0}
            onChange={(event) => setEnergy(Number(event.target.value))}
            type="range"
            value={energy}
          />
        </div>

        <div className="mt-4 rounded-none border-4 border-black bg-[#fffdf3] p-3 text-[10px] text-black">
          <p>现在的完成度: {previewCompletion.toFixed(2)}%</p>
          <p className="mt-1">温柔目标线: {adjustedTarget}</p>
          <p className="mt-2 text-[9px] text-[#8b1c1c]">
            累了就慢点走，慢慢来，比较快。
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className={buttonClass}
            onClick={() =>
              onCommit({
                phase: "afternoon",
                energyLevel: clamp(energy, 0, 100),
                baseTarget: Math.max(1, baseTarget),
                actualDone: Math.max(0, actualDone)
              })
            }
            type="button"
          >
            摸摸头，记录一下
          </button>
        </div>
      </div>
    );
  }

  if (phase === "evening") {
    const safeCompletion = calculateProgress(energy, actualDone, baseTarget);

    return (
      <div className="w-full rounded-none border-4 border-black bg-[#d7d9ff] p-5 shadow-[8px_8px_0_#000]">
        <p className="text-[12px] text-black">回家休息吧</p>
        <p className="mt-2 text-[10px] text-black">今天的独家记忆</p>
        <div className="mt-3 space-y-2 rounded-none border-4 border-black bg-white p-3 text-[10px] text-black">
          <p>实际完成: {actualDone}</p>
          <p>最终能量: {energy}</p>
          <p>动态目标: {adjustedTarget}</p>
          <p>日完成率: {safeCompletion.toFixed(2)}%</p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className={buttonClass}
            onClick={() =>
              onCommit({
                phase: "evening",
                energyLevel: clamp(energy, 0, 100),
                baseTarget: Math.max(1, baseTarget),
                actualDone: Math.max(0, actualDone)
              })
            }
            type="button"
          >
            睡个好觉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-none border-4 border-black bg-[#ececff] p-5 text-[11px] text-black shadow-[8px_8px_0_#000]">
      <p className="text-[12px]">你长大了</p>
      <p className="mt-2 text-[10px]">看着你变成独角兽，我真为你骄傲。</p>
    </div>
  );
}

export default PhaseController;
