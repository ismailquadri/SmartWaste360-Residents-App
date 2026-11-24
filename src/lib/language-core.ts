import messages from "@/lib/locales/messages.json";

export const LANGUAGES = [
  { code: "en", name: "English", short: "EN", locale: "en-NG" },
  { code: "pcm", name: "Nigerian Pidgin", short: "PCM", locale: "en-NG" },
  { code: "yo", name: "Yorùbá", short: "YO", locale: "yo-NG" },
  { code: "ig", name: "Igbo", short: "IG", locale: "ig-NG" },
  { code: "ha", name: "Hausa", short: "HA", locale: "ha-NG" },
] as const;
export type Language = typeof LANGUAGES[number]["code"];
export const LANGUAGE_KEY = "lawma-resident-language-v1";
type Catalogue = Record<string, Partial<Record<Exclude<Language, "en">, string>>>;
export const catalogue: Catalogue = messages;
export function resolveLanguage(value: unknown): Language {
  return LANGUAGES.find((item) => item.code === value)?.code ?? "en";
}
export function readLanguage(storage: Pick<Storage, "getItem">): Language {
  try { return resolveLanguage(storage.getItem(LANGUAGE_KEY)); } catch { return "en"; }
}
export function writeLanguage(storage: Pick<Storage, "setItem">, language: Language): boolean {
  try { storage.setItem(LANGUAGE_KEY, language); return true; } catch { return false; }
}
export function translate(source: string, language: Language, ...values: (string | number)[]): string {
  const translated = language === "en" ? source : catalogue[source]?.[language] ?? source;
  return translated.replace(/\{(\d+)\}/g, (placeholder, index: string) => String(values[Number(index)] ?? placeholder));
}

const patterns = Object.keys(catalogue).filter((key) => /\{\d+\}/.test(key) && /[A-Za-z]{3}/.test(key.replace(/\{\d+\}/g, ""))).map((source) => {
  const indexes = [...source.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1]));
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped.replace(/\\\{\d+\\\}/g, "(.*?)")}$`);
  return { source, indexes, pattern };
});

/** Translate presentation values only, never stored enums or resident-authored text. */
export function localizeText(source: string, language: Language): string {
  if (language === "en") return source;
  if (catalogue[source]?.[language]) return translate(source, language);
  const normalized = source.replace(/\s+/g, " ").trim();
  if (catalogue[normalized]?.[language]) return translate(normalized, language);
  for (const { source: template, indexes, pattern } of patterns) {
    const match = pattern.exec(normalized);
    if (!match) continue;
    const values: string[] = [];
    indexes.forEach((index, position) => { values[index] = match[position + 1] ?? ""; });
    return translate(template, language, ...values);
  }
  return source;
}