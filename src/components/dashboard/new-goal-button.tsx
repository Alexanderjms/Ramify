"use client";

import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import { useGoals } from "@/components/goals/goals-provider";
import { useLanguage } from "@/components/language-provider";

export default function NewGoalButton() {
  const { openCreateGoal } = useGoals();
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={openCreateGoal}
      className="paint-hover flex cursor-pointer items-center gap-[7px] rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white"
    >
      <PaintHover>
        <Icon name="plus" className="size-[15px]" />
        {t("Nueva meta")}
      </PaintHover>
    </button>
  );
}
