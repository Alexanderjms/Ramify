import type { GoalActivity, GoalActivityChanges } from "@/lib/goal-activities";
import { useLanguage } from "@/components/language-provider";
import Select from "@/components/select";
import JellyRadio from "@/components/JellyRadio";
import DatePicker from "@/components/date-picker";
import { ActivityStatus } from "./goal-diagram";

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
      <div>
        <dt>{t("Estado")}</dt>
        <dd data-field="status">
          <Select
            label="Estado"
            value={activity.status}
            options={[
              {
                value: "pending",
                label: "Pendiente",
                icon: <ActivityStatus status="pending" />,
              },
              {
                value: "progress",
                label: "En proceso",
                icon: <ActivityStatus status="progress" />,
              },
              {
                value: "completed",
                label: "Completada",
                icon: <ActivityStatus status="completed" />,
              },
            ]}
            icon={<ActivityStatus status={activity.status} />}
            onChange={(status) => onUpdate({ status })}
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
