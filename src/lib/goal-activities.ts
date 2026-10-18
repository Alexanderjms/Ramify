export function isStoredGoalFile(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^ramify-file:[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)
  );
}

export type GoalResource = {
  id: string;
  url: string;
  name?: string;
  fileName?: string;
};

export type GoalActivity = {
  id: string;
  name: string;
  color: string;
  status: "pending" | "progress" | "completed";
  children?: GoalActivity[];
  subtasks?: { id: string; name: string; status: "pending" | "completed" }[];
  description?: string;
  priority?: "low" | "medium" | "high";
  targetDate?: string;
  notes?: string;
  resources?: GoalResource[];
};

export type GoalActivityChanges =
  Partial<GoalActivity> | ((current: GoalActivity) => Partial<GoalActivity>);

export function removeActivity(
  activities: GoalActivity[],
  id: string,
): GoalActivity[] {
  return activities
    .filter((activity) => activity.id !== id)
    .map((activity) =>
      activity.children
        ? { ...activity, children: removeActivity(activity.children, id) }
        : activity,
    );
}

export function colorActivity(
  activity: GoalActivity,
  color: string,
): GoalActivity {
  return {
    ...activity,
    color,
    children: activity.children?.map((child) => colorActivity(child, color)),
  };
}

export function validResourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const blue = "#3B82F6";
const violet = "#A78BFA";
const activity = (
  id: string,
  name: string,
  status: GoalActivity["status"] = "pending",
  children?: GoalActivity[],
  color = blue,
): GoalActivity => ({ id, name, status, children, color });

export const exampleActivities: GoalActivity[] = [
  activity("duolingo", "Duolingo", "pending", [
    activity("unidad-1", "Unidad 1", "completed", [
      activity("saludos", "Saludos", "completed"),
      activity("vocabulario", "Vocabulario", "completed"),
      activity("frases", "Frases básicas", "completed"),
    ]),
    activity("unidad-2", "Unidad 2", "pending", [
      activity("presente", "Presente simple"),
      activity("preguntas", "Preguntas"),
      activity("negaciones", "Negaciones"),
    ]),
  ]),
  activity(
    "curso",
    "Curso de inglés",
    "pending",
    [
      activity(
        "modulo-1",
        "Módulo 1",
        "completed",
        [
          activity(
            "lectura",
            "Lectura inicial",
            "completed",
            undefined,
            violet,
          ),
          activity(
            "ejercicios",
            "Ejercicios de repaso",
            "completed",
            undefined,
            violet,
          ),
        ],
        violet,
      ),
      activity("modulo-2", "Módulo 2", "pending", undefined, violet),
    ],
    violet,
  ),
  activity("conversacion", "Práctica de conversación", "pending", [
    activity("intercambio", "Intercambio semanal"),
    activity("libre", "Conversación libre"),
  ]),
  activity(
    "comprension",
    "Comprensión auditiva",
    "pending",
    [
      activity("podcasts", "Escuchar podcasts", "pending", undefined, violet),
      activity(
        "peliculas",
        "Películas en inglés",
        "pending",
        undefined,
        violet,
      ),
    ],
    violet,
  ),
];

export function flattenActivities(activities: GoalActivity[]): GoalActivity[] {
  return activities.flatMap((item) => [
    item,
    ...flattenActivities(item.children ?? []),
  ]);
}

export function validActivities(
  value: unknown,
  ids = new Set<string>(),
  depth = 0,
): value is GoalActivity[] {
  return (
    depth < 32 &&
    Array.isArray(value) &&
    value.every((item) => {
      if (
        !item ||
        typeof item.id !== "string" ||
        !item.id ||
        ids.has(item.id) ||
        ids.size >= 2000 ||
        typeof item.name !== "string" ||
        !item.name.trim() ||
        item.name.length > 100 ||
        typeof item.color !== "string" ||
        !/^#[a-f\d]{6}$/i.test(item.color) ||
        !["pending", "progress", "completed"].includes(item.status)
      )
        return false;
      if (
        (item.description !== undefined &&
          (typeof item.description !== "string" ||
            item.description.length > 4000)) ||
        (item.notes !== undefined &&
          (typeof item.notes !== "string" || item.notes.length > 10000)) ||
        (item.priority !== undefined &&
          !["low", "medium", "high"].includes(item.priority))
      )
        return false;
      if (item.targetDate !== undefined && item.targetDate !== "") {
        if (
          typeof item.targetDate !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.targetDate) ||
          item.targetDate.startsWith("0000-")
        )
          return false;
        const date = new Date(`${item.targetDate}T00:00:00Z`);
        if (
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== item.targetDate
        )
          return false;
      }
      if (
        item.resources !== undefined &&
        (!Array.isArray(item.resources) ||
          item.resources.length > 50 ||
          !item.resources.every(
            (resource: GoalResource) =>
              resource &&
              typeof resource.id === "string" &&
              resource.id &&
              (resource.name === undefined ||
                (typeof resource.name === "string" &&
                  resource.name.trim() &&
                  resource.name.length <= 200)) &&
              (resource.fileName === undefined
                ? validResourceUrl(resource.url)
                : typeof resource.fileName === "string" &&
                  resource.fileName.trim() &&
                  resource.fileName.length <= 255 &&
                  !/[\x00-\x1f]/.test(resource.fileName) &&
                  typeof resource.url === "string" &&
                  (isStoredGoalFile(resource.url) ||
                    (resource.url.length <= 1398145 &&
                      /^data:application\/octet-stream;base64,[A-Za-z0-9+/]*={0,2}$/.test(
                        resource.url,
                      )))),
          ) ||
          new Set(item.resources.map((resource: GoalResource) => resource.id))
            .size !== item.resources.length)
      )
        return false;
      ids.add(item.id);
      if (
        item.subtasks !== undefined &&
        (!Array.isArray(item.subtasks) ||
          item.subtasks.length > 2000 ||
          !item.subtasks.every(
            (task: NonNullable<GoalActivity["subtasks"]>[number]) =>
              task &&
              typeof task.id === "string" &&
              task.id &&
              typeof task.name === "string" &&
              task.name.trim() &&
              task.name.length <= 100 &&
              ["pending", "completed"].includes(task.status),
          ) ||
          new Set(item.subtasks.map((task: { id: string }) => task.id)).size !==
            item.subtasks.length)
      )
        return false;
      return (
        item.children === undefined ||
        validActivities(item.children, ids, depth + 1)
      );
    })
  );
}

export function mapActivities(
  activities: GoalActivity[],
  id: string,
  update: (item: GoalActivity) => GoalActivity,
): GoalActivity[] {
  return activities.map((item) =>
    item.id === id
      ? update(item)
      : {
          ...item,
          children: item.children && mapActivities(item.children, id, update),
        },
  );
}
