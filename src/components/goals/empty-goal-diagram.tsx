import { useId } from "react";
import { useLanguage } from "@/components/language-provider";

export default function EmptyGoalDiagram({
  onCreate,
}: {
  onCreate: (parent: string, name: string) => boolean;
}) {
  const { t } = useLanguage();
  const id = useId();
  return (
    <section className="goal-diagram-empty" aria-labelledby={`${id}-title`}>
      <div className="w-full max-w-sm">
        <i
          aria-hidden="true"
          className="bi bi-diagram-3 mb-6 block text-4xl text-zinc-500"
        />
        <h2
          id={`${id}-title`}
          className="text-xl font-medium tracking-tight text-white"
        >
          {t("Tu meta empieza aquí")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {t(
            "Divide tu objetivo en metas más pequeñas. Añade la primera para empezar tu diagrama.",
          )}
        </p>
        <form
          className="mt-7 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "name",
            ) as HTMLInputElement;
            if (!input.value.trim()) {
              input.setCustomValidity(t("Escribe el nombre de la meta."));
              input.reportValidity();
              return;
            }
            onCreate("", input.value);
          }}
        >
          <label htmlFor={id} className="mb-2 block text-xs text-zinc-300">
            {t("Nombre de la primera meta")}
          </label>
          <input
            id={id}
            name="name"
            required
            maxLength={100}
            placeholder={t("Ej. Practicar 15 minutos al día")}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-400"
          />
          <button
            type="submit"
            className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-medium text-black hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <i aria-hidden="true" className="bi bi-plus-lg" />
            {t("Añadir primera meta")}
          </button>
        </form>
      </div>
    </section>
  );
}
