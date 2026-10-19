"use client";

import { useId, useState, type ComponentProps } from "react";
import { gooeyToast } from "goey-toast";
import { useLanguage } from "./language-provider";
import { FormError } from "./app-feedback";
import { validText } from "@/lib/input-validation";

export default function ValidatedForm({
  children,
  onSubmit,
  onInput,
  onReset,
  ...props
}: ComponentProps<"form">) {
  const { t } = useLanguage();
  const id = useId();
  const [error, setError] = useState("");
  return (
    <form
      {...props}
      noValidate
      onReset={(event) => {
        setError("");
        event.currentTarget
          .querySelectorAll('[aria-invalid="true"]')
          .forEach((input) => {
            input.removeAttribute("aria-invalid");
            input.removeAttribute("aria-errormessage");
          });
        onReset?.(event);
      }}
      onInput={(event) => {
        const input = event.target as HTMLInputElement;
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-errormessage");
        if (input.getAttribute("aria-describedby") === id)
          input.removeAttribute("aria-describedby");
        setError("");
        gooeyToast.dismiss(id);
        onInput?.(event);
      }}
      onSubmit={(event) => {
        const form = event.currentTarget;
        const input = Array.from(form.elements).find(
          (element) =>
            (element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement) &&
            element.willValidate &&
            (!element.validity.valid ||
              !validText(
                element.value,
                Infinity,
                element instanceof HTMLTextAreaElement,
              )),
        ) as HTMLInputElement | HTMLTextAreaElement | undefined;
        if (input) {
          event.preventDefault();
          let message = t("Revisa el valor de este campo.");
          if (
            !validText(
              input.value,
              Infinity,
              input instanceof HTMLTextAreaElement,
            )
          )
            message = t("El texto contiene caracteres no válidos.");
          else if (input.validity.valueMissing)
            message = t("Completa este campo.");
          else if (input.validity.customError)
            message = input.validationMessage;
          else if (
            input.type === "url" &&
            (input.validity.patternMismatch || input.validity.typeMismatch)
          )
            message = t("Usa un enlace http:// o https:// válido.");
          else if (input.validity.patternMismatch)
            message = t("Escribe un nombre que no contenga solo espacios.");
          else if (
            input.validity.rangeUnderflow ||
            input.validity.rangeOverflow ||
            input.validity.badInput ||
            input.validity.stepMismatch
          )
            message = t("Introduce un número entero entre 35 y 200.");
          input.setAttribute("aria-invalid", "true");
          input.focus();
          if (form.closest("dialog")) {
            input.setAttribute("aria-errormessage", id);
            setError(message);
          } else
            gooeyToast.error(t("No se pudo completar la acción"), {
              id,
              description: message,
              duration: 6000,
            });
          return;
        }
        setError("");
        onSubmit?.(event);
      }}
    >
      {children}
      <FormError id={id}>{error}</FormError>
    </form>
  );
}
