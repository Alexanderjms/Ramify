"use client";

import { useEffect, useRef } from "react";
import { gooeyToast } from "goey-toast";
import { mapActivities, type GoalActivity } from "@/lib/goal-activities";
import { errorMessage, responseError } from "@/lib/feedback";
import { validText } from "@/lib/input-validation";
import { useLanguage } from "@/components/language-provider";

type Update = (
  next: GoalActivity[] | ((current: GoalActivity[]) => GoalActivity[]),
) => boolean;

export default function useLinkBranchTitle(
  goalId: string,
  userId: string,
  update: Update,
) {
  const { t } = useLanguage();
  const requests = useRef(new Map<string, AbortController>());
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const pending = requests.current;
    return () => {
      active.current = false;
      for (const [id, controller] of pending) {
        controller.abort();
        gooeyToast.dismiss(`link-title:${id}`);
      }
      pending.clear();
    };
  }, [goalId, userId]);

  async function load(item: GoalActivity, url: string) {
    if (!active.current) return;
    requests.current.get(item.id)?.abort();
    const controller = new AbortController();
    requests.current.set(item.id, controller);
    const toastId = `link-title:${item.id}`;
    gooeyToast.dismiss(toastId);
    try {
      const response = await fetch("/api/link-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ramify-User-Id": userId,
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(12000),
        ]),
      });
      if (!response.ok) throw responseError(response);
      const { title }: { title: unknown } = await response.json();
      if (!validText(title, 100) || !title.trim())
        throw new Error("Title unavailable");
      if (controller.signal.aborted) return;
      update((current) =>
        mapActivities(current, item.id, (activity) =>
          activity.name === item.name &&
          activity.resources?.some(
            (resource) =>
              resource.id === item.resources?.[0].id && resource.url === url,
          )
            ? { ...activity, name: title }
            : activity,
        ),
      );
      requests.current.delete(item.id);
    } catch (error) {
      if (controller.signal.aborted || !active.current) return;
      requests.current.delete(item.id);
      gooeyToast.error(t("No se pudo obtener el título"), {
        id: toastId,
        description: t(
          errorMessage(
            error,
            "El enlace se guardó en Recursos. Puedes editar el nombre o reintentar.",
          ),
        ),
        action: {
          label: t("Reintentar"),
          onClick: () => {
            void load(item, url);
          },
        },
      });
    }
  }

  function cancel(ids: Iterable<string>) {
    for (const id of ids) {
      requests.current.get(id)?.abort();
      requests.current.delete(id);
      gooeyToast.dismiss(`link-title:${id}`);
    }
  }

  return { load, cancel };
}
