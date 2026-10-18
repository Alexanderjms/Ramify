"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { english } from "@/lib/translations";

type Language = "es" | "en";
const key = "ramify:language";
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string) => string;
}>({ language: "es", setLanguage: () => {}, t: (text) => text });
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("ramify:language-updated", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("ramify:language-updated", notify);
  };
}
function snapshot(): Language {
  try {
    return localStorage.getItem(key) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}
export default function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const language = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "es" as Language,
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const setLanguage = (value: Language) => {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event("ramify:language-updated"));
  };
  const t = (text: string) =>
    language === "en" ? (english[text] ?? text) : text;
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
