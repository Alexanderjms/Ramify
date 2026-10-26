"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { GooeyToaster, gooeyToast } from "goey-toast";
import { useRouter } from "next/navigation";
import { useLanguage } from "./language-provider";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/feedback";

export default function AppToaster() {
  return (
    <GooeyToaster
      theme="dark"
      position="top-center"
      preset="subtle"
      closeButton
      closeOnEscape={false}
      showTimestamp={false}
      maxQueue={4}
      offset={16}
    />
  );
}

export function FormError({
  children,
  id,
  onRetry,
}: {
  children?: ReactNode;
  id?: string;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();
  return children ? (
    <div id={id} role="alert" className="app-form-error">
      <i aria-hidden="true" className="bi bi-exclamation-circle shrink-0" />
      <div className="min-w-0 flex-1">
        {children}
        {onRetry && (
          <button
            type="button"
            className="mt-2 block cursor-pointer underline underline-offset-4"
            onClick={onRetry}
          >
            {t("Reintentar")}
          </button>
        )}
      </div>
    </div>
  ) : null;
}

export function SyncToast({
  id,
  pending,
  failed,
}: {
  id: string;
  pending: boolean;
  failed: boolean;
}) {
  const { t } = useLanguage();
  const saving = useRef(false);
  const savingTitle = t("Guardando cambios…");
  const savedTitle = t("Cambios guardados");
  useEffect(() => {
    if (failed) {
      saving.current = false;
      gooeyToast.dismiss(id);
    } else if (pending) {
      saving.current = true;
      gooeyToast(savingTitle, { id, duration: Infinity });
    } else if (saving.current) {
      saving.current = false;
      gooeyToast.update(id, {
        type: "success",
        title: savedTitle,
      });
      const timer = setTimeout(() => gooeyToast.dismiss(id), 4000);
      return () => clearTimeout(timer);
    }
  }, [id, pending, failed, savingTitle, savedTitle]);
  useEffect(
    () => () => {
      gooeyToast.dismiss(id);
    },
    [id],
  );
  return null;
}

export function ErrorToast({
  id,
  message,
  onRetry,
}: {
  id: string;
  message?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const retry = useRef(onRetry);
  const translate = useRef(t);
  useEffect(() => {
    retry.current = onRetry;
    translate.current = t;
  }, [onRetry, t]);
  useEffect(() => {
    if (!message) return;
    const expired = message === SESSION_EXPIRED_MESSAGE;
    gooeyToast.error(
      translate.current(
        expired ? "Iniciar sesión" : "No se pudo completar la acción",
      ),
      {
        id: expired ? "session-expired" : id,
        description: translate.current(message),
        duration: 12000,
        action: expired
          ? {
              label: translate.current("Iniciar sesión"),
              onClick: () => router.push("/login"),
            }
          : retry.current
            ? {
                label: translate.current("Reintentar"),
                onClick: () => retry.current?.(),
              }
            : undefined,
        fillColor: "#18181b",
        borderColor: "#52525b",
      },
    );
    if (expired) return;
    return () => {
      gooeyToast.dismiss(id);
    };
  }, [id, message, language, router]);
  return null;
}
