import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { vi } from "./vi";
import { en } from "./en";
import { supabase } from "../lib/supabase";

export type Language = "vi" | "en";
export type Translations = typeof vi;

const STORAGE_KEY = "app-language";

function detectBrowserLanguage(): Language {
  const lang = navigator.language?.toLowerCase() || "";
  if (lang.startsWith("vi")) return "vi";
  return "en";
}

function getSavedLanguage(): Language | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "vi" || saved === "en") return saved;
  return null;
}

const translations: Record<Language, Translations> = { vi, en };

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language, profileId?: string) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "vi",
  setLang: () => {},
  t: vi,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(
    () => getSavedLanguage() ?? detectBrowserLanguage(),
  );

  const setLang = (newLang: Language, profileId?: string) => {
    localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);
    if (profileId) {
      supabase
        .from("profiles")
        .update({ language: newLang })
        .eq("id", profileId)
        .then(() => {});
    }
  };

  // Sync nếu localStorage bị xóa bên ngoài
  useEffect(() => {
    const saved = getSavedLanguage();
    if (!saved) localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Helper: thay {key} trong string với giá trị */
export function interpolate(
  str: string,
  vars: Record<string, string | number>,
) {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
