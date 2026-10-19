import bootstrapIcons from "bootstrap-icons/font/bootstrap-icons.json";

export const goalIcons = Object.keys(bootstrapIcons).sort();

export function isGoalIcon(value: unknown): value is string {
  return typeof value === "string" && Object.hasOwn(bootstrapIcons, value);
}
