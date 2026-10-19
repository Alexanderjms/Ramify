import { useId } from "react";
import { useLanguage } from "@/components/language-provider";
import "@/components/login/github-button.css";
import ValidatedForm from "@/components/validated-form";
import BranchNameInput from "./branch-name-input";

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
        <ValidatedForm
          className="mt-7 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "name",
            ) as HTMLInputElement;
            onCreate("", input.value);
          }}
        >
          <label htmlFor={id} className="mb-2 block text-xs text-zinc-300">
            {t("Nombre de la primera meta")}
          </label>
          <BranchNameInput
            id={id}
            name="name"
            required
            pattern={".*\\S.*"}
            placeholder={t("Ej. Practicar 15 minutos al día")}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-400"
          />
          <button
            type="submit"
            className="github-login-button relative mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md border border-white bg-white px-4 py-3 text-sm font-medium text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <i aria-hidden="true" className="bi bi-plus-lg" />
            {t("Añadir primera meta")}
            <span
              aria-hidden="true"
              className="github-login-ink absolute inset-0 flex items-center justify-center gap-2 bg-black text-white"
            >
              <i className="bi bi-plus-lg" />
              {t("Añadir primera meta")}
            </span>
          </button>
        </ValidatedForm>
      </div>
    </section>
  );
}
