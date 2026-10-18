"use client";

import { useLanguage } from "@/components/language-provider";
import Icon from "@/components/icon";
import NewGoalButton from "@/components/dashboard/new-goal-button";

export default function EmptyGoals() {
  const { t } = useLanguage();
  return (
    <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-zinc-950 text-zinc-400">
        <Icon name="branch" className="size-5" />
      </div>
      <h2 className="text-base font-medium">{t("No hay metas creadas")}</h2>
      <p className="mb-6 mt-2 max-w-[300px] text-xs leading-5 text-zinc-400">
        {t("Crea una meta para organizar sus tareas y consultar su progreso.")}
      </p>
      <NewGoalButton />
    </div>
  );
}
