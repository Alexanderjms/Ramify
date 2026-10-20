import type { GoalActivity, GoalActivityChanges } from "@/lib/goal-activities";
import { useLanguage } from "@/components/language-provider";
import JellyRadio from "@/components/JellyRadio";
import DatePicker from "@/components/date-picker";
import { ActivityStatus } from "./activity-status";

export default function BranchProperties({
  activity,
  onUpdate,
}: {
  activity: GoalActivity;
  onUpdate: (changes: GoalActivityChanges) => boolean;
}) {
  const { t } = useLanguage();
  return (
    <dl className="branch-properties">
      <div className="branch-status-property">
        <dt>{t("Estado")}</dt>
        <dd data-field="status">
          <JellyRadio
            ariaLabel={t("Estado")}
            value={activity.status}
            size="sm"
            gap={4}
            swell={0.12}
            barge={3}
            className="branch-status-options"
            items={[
              {
                value: "pending",
                label: t("Pendiente"),
                icon: <ActivityStatus status="pending" />,
              },
              {
                value: "progress",
                label: t("En proceso"),
                icon: <ActivityStatus status="progress" />,
              },
              {
                value: "completed",
                label: t("Completada"),
                icon: <ActivityStatus status="completed" />,
              },
            ]}
            onChange={(status) => {
              if (
                status === "pending" ||
                status === "progress" ||
                status === "completed"
              )
                onUpdate({ status });
            }}
          />
        </dd>
      </div>
      <div>
        <dt>{t("Prioridad")}</dt>
        <dd data-field="priority">
          <JellyRadio
            ariaLabel={t("Prioridad")}
            value={activity.priority ?? "medium"}
            size="sm"
            gap={4}
            swell={0.12}
            barge={3}
            items={[
              {
                value: "low",
                label: t("Baja"),
                icon: (
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-blue-500"
                  />
                ),
              },
              {
                value: "medium",
                label: t("Media"),
                icon: (
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-orange-500"
                  />
                ),
              },
              {
                value: "high",
                label: t("Alta"),
                icon: (
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-green-500"
                  />
                ),
              },
            ]}
            onChange={(priority) => {
              if (
                priority === "low" ||
                priority === "medium" ||
                priority === "high"
              )
                onUpdate({ priority });
            }}
          />
        </dd>
      </div>
      <div>
        <dt>{t("Fecha objetivo")}</dt>
        <dd data-field="targetDate">
          <DatePicker
            label="Fecha objetivo"
            value={activity.targetDate ?? ""}
            onChange={(targetDate) => onUpdate({ targetDate })}
          />
        </dd>
      </div>
    </dl>
  );
}
