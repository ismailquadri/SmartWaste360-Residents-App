import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGES, localizeText, readLanguage, translate, writeLanguage, type Language } from "@/lib/language-core";

type LanguageContext = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (source: string, ...values: (string | number)[]) => string;
  localize: <T>(value: T) => T;
};
const english: LanguageContext = {
  language: "en", setLanguage: () => {},
  t: (source, ...values) => translate(source, "en", ...values),
  localize: (value) => value,
};
const Context = createContext<LanguageContext>(english);
export function LanguageProvider({ children }: { children: ReactNode }) {
  // Same English first render on server and browser; restore preference after hydration.
  const [language, updateLanguage] = useState<Language>("en");
  useEffect(() => { try { updateLanguage(readLanguage(localStorage)); } catch { /* Device storage may be restricted. */ } }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
  }, [language]);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try { writeLanguage(localStorage, next); } catch { /* Language still changes for this session. */ }
  }, []);
  const value = useMemo<LanguageContext>(() => {
    const localize = <T,>(value: T): T => {
      if (typeof value === "string") return localizeText(value, language) as T;
      if (Array.isArray(value)) return value.map(localize) as T;
      return value;
    };
    return { language, setLanguage, t: (source, ...values) => translate(source, language, ...values), localize };
  }, [language, setLanguage]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage() { return useContext(Context); }
export { LANGUAGES };