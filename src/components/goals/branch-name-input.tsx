import type { ComponentProps } from "react";
import { useLanguage } from "@/components/language-provider";
import { validResourceUrl } from "@/lib/goal-activities";

export default function BranchNameInput(props: ComponentProps<"input">) {
  const { t } = useLanguage();
  return (
    <input
      {...props}
      maxLength={2000}
      onInput={(event) => {
        const input = event.currentTarget;
        const value = input.value.trim();
        input.setCustomValidity(
          !validResourceUrl(value) && value.length > 100
            ? t("El nombre no puede superar los 100 caracteres.")
            : "",
        );
        props.onInput?.(event);
      }}
    />
  );
}
