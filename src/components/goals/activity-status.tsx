import { type GoalActivity } from "@/lib/goal-activities";

export function ActivityStatus({ status }: { status: GoalActivity["status"] }) {
  return (
    <i
      aria-hidden="true"
      className={`bi text-xs leading-none ${status === "completed" ? "bi-check-circle-fill text-green-500" : status === "progress" ? "bi-record-circle text-blue-500" : "bi-circle text-zinc-400"}`}
    />
  );
}
