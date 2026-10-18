import Icon from "@/components/icon";
import type { Goal } from "@/lib/goals";

export default function GoalSymbol({
  goal,
}: {
  goal: Pick<Goal, "icon" | "color">;
}) {
  return goal.icon ? (
    <i
      aria-hidden="true"
      className={`bi bi-${goal.icon} shrink-0 text-[19px] leading-none`}
      style={{ color: goal.color }}
    />
  ) : (
    <Icon name="branch" className="size-[19px]" style={{ color: goal.color }} />
  );
}
