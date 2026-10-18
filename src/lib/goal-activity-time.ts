export function formatGoalActivityTime(
  timestamp: number | null | undefined,
  language: "es" | "en",
  now = Date.now(),
): { text: string; title?: string } | undefined {
  // Missing timestamps belong to legacy goals; never infer dates from their labels.
  if (timestamp === undefined) return undefined;
  if (
    timestamp === null ||
    !Number.isFinite(timestamp) ||
    !Number.isFinite(new Date(timestamp).getTime())
  )
    return { text: language === "en" ? "No activity" : "Sin actividad" };

  const seconds = (timestamp - now) / 1000;
  const magnitude = Math.abs(seconds);
  const [unit, size]: [Intl.RelativeTimeFormatUnit, number] =
    magnitude < 60
      ? ["second", 1]
      : magnitude < 3600
        ? ["minute", 60]
        : magnitude < 86400
          ? ["hour", 3600]
          : magnitude < 2592000
            ? ["day", 86400]
            : magnitude < 31536000
              ? ["month", 2592000]
              : ["year", 31536000];

  return {
    text: new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(
      Math.round(seconds / size),
      unit,
    ),
    title: new Intl.DateTimeFormat(language, {
      dateStyle: "long",
      timeStyle: "long",
    }).format(timestamp),
  };
}
