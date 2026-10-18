export type UserPreferences = {
  language: "es" | "en";
  goalView: "grid" | "list";
  goalSort: "activity" | "name" | "progress" | "least-progress";
  goalStatus: "Todas" | "En progreso" | "Sin comenzar" | "Completadas";
  sidebarCollapsed: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  language: "es",
  goalView: "grid",
  goalSort: "activity",
  goalStatus: "Todas",
  sidebarCollapsed: false,
};

const choices = {
  language: ["es", "en"],
  goalView: ["grid", "list"],
  goalSort: ["activity", "name", "progress", "least-progress"],
  goalStatus: ["Todas", "En progreso", "Sin comenzar", "Completadas"],
} as const;

export function parsePreferencesPatch(
  value: unknown,
): Partial<UserPreferences> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid preferences");
  const entries = Object.entries(value);
  if (!entries.length) throw new Error("Empty preferences");
  for (const [key, item] of entries) {
    if (key === "sidebarCollapsed") {
      if (typeof item === "boolean") continue;
    } else if (
      Object.hasOwn(choices, key) &&
      (choices[key as keyof typeof choices] as readonly unknown[]).includes(
        item,
      )
    ) {
      continue;
    }
    throw new Error("Invalid preferences");
  }
  return Object.fromEntries(entries) as Partial<UserPreferences>;
}
