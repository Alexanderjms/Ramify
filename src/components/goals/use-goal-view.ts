"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GoalView } from "@/lib/goal-view";

export default function useGoalView(id: string, initialView: GoalView) {
  const [view, setView] = useState(initialView);
  const [saveError, setSaveError] = useState(false);
  const latest = useRef(initialView);
  const position = useRef({
    scrollLeft: initialView.scrollLeft,
    scrollTop: initialView.scrollTop,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saved = useRef(JSON.stringify(initialView));
  const queue = useRef(Promise.resolve());

  const saveView = useCallback(() => {
    const body = JSON.stringify({ ...latest.current, ...position.current });
    queue.current = queue.current.then(async () => {
      if (body === saved.current) return;
      try {
        const response = await fetch(
          `/api/goals/${encodeURIComponent(id)}/view`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: new Blob([body]).size < 64000,
          },
        );
        if (!response.ok) throw new Error("Could not save view");
        saved.current = body;
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    });
  }, [id]);

  const scheduleSave = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(saveView, 400);
  }, [saveView]);

  const updateScroll = useCallback(
    (scrollLeft: number, scrollTop: number) => {
      if (
        position.current.scrollLeft === scrollLeft &&
        position.current.scrollTop === scrollTop
      )
        return;
      position.current = { scrollLeft, scrollTop };
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    latest.current = view;
    scheduleSave();
  }, [view, scheduleSave]);

  useEffect(() => {
    window.addEventListener("pagehide", saveView);
    return () => {
      window.removeEventListener("pagehide", saveView);
      clearTimeout(timer.current);
      saveView();
    };
  }, [saveView]);

  return { view, setView, updateScroll, saveError, retrySave: saveView };
}
