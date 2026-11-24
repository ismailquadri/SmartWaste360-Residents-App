import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LANGUAGES, LANGUAGE_KEY, catalogue, localizeText, readLanguage, resolveLanguage, translate, writeLanguage } from "@/lib/language-core";
import { LanguageProvider, useLanguage } from "@/lib/language";

beforeEach(() => localStorage.clear());

describe("Resident language preferences", () => {
  it("supports exactly English, Nigerian Pidgin, Yorùbá, Igbo and Hausa", () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual(["en", "pcm", "yo", "ig", "ha"]);
    expect(LANGUAGES.map((language) => language.name)).toEqual(["English", "Nigerian Pidgin", "Yorùbá", "Igbo", "Hausa"]);
  });

  it.each(["en", "pcm", "yo", "ig", "ha"] as const)("retains %s on device after a reload", (language) => {
    expect(writeLanguage(localStorage, language)).toBe(true);
    expect(readLanguage(localStorage)).toBe(language);
    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });
    expect(result.current.language).toBe(language);
  });

  it("changes the interface language without changing saved resident data", () => {
    const resident = JSON.stringify({ name: "Adaeze", balance: 7500, phone: "08030000000" });
    localStorage.setItem("lawma-customer-demo-v2", resident);
    const { result } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });
    act(() => result.current.setLanguage("yo"));
    expect(document.documentElement.lang).toBe("yo");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("yo");
    expect(localStorage.getItem("lawma-customer-demo-v2")).toBe(resident);
  });

  it("falls back safely for unsupported or inaccessible saved preferences", () => {
    expect(resolveLanguage("fr")).toBe("en");
    expect(readLanguage({ getItem: () => { throw new Error("Storage unavailable"); } })).toBe("en");
    expect(writeLanguage({ setItem: () => { throw new Error("Storage unavailable"); } }, "ha")).toBe(false);
  });

  it("preserves amounts, identifiers and resident-authored text", () => {
    expect(translate("Pay {0}", "en", "₦3,750")).toBe("Pay ₦3,750");
    expect(localizeText("Adaeze Okafor, Gate B · 08031234567", "yo")).toBe("Adaeze Okafor, Gate B · 08031234567");
    expect(localizeText("₦7,500", "ha")).toBe("₦7,500");
    expect(localizeText("ROOM-QR-BAG-042-RM02", "ig")).toBe("ROOM-QR-BAG-042-RM02");
  });

  it("includes all four native translations without dropping numeric placeholders", () => {
    expect(Object.keys(catalogue).length).toBeGreaterThan(500);
    for (const [source, languages] of Object.entries(catalogue)) {
      const placeholders = source.match(/\{\d+\}/g)?.sort() ?? [];
      for (const language of ["pcm", "yo", "ig", "ha"] as const) {
        const translated = languages[language];
        expect(translated?.trim().length, `${source}: ${language}`).toBeGreaterThan(0);
        expect(translated?.match(/\{\d+\}/g)?.sort() ?? []).toEqual(placeholders);
      }
    }
  });
});