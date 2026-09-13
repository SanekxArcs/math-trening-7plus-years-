import { describe, expect, it } from "vitest";
import {
  LANGS,
  isLang,
  translate,
  translations,
  type Lang,
  type TranslationKey,
} from "./translations";

const KEYS = Object.keys(translations.en) as TranslationKey[];

function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string).sort();
}

describe("translations", () => {
  it("covers every key in every language", () => {
    // The types already enforce this, but the check is cheap and it also catches
    // a key that exists with an empty string.
    for (const lang of LANGS) {
      for (const key of KEYS) {
        expect(translations[lang][key], `${lang}.${key}`).toBeTruthy();
      }
    }
  });

  it("has no extra keys in the non-English languages", () => {
    for (const lang of LANGS) {
      expect(Object.keys(translations[lang]).sort()).toEqual([...KEYS].sort());
    }
  });

  /**
   * The one failure the type system cannot see: a translator drops `{count}`
   * from a string and the number silently disappears from the UI. Nothing
   * crashes, and nobody notices until a child is looking at "w rzędu".
   */
  it("keeps the same placeholders across every language", () => {
    for (const key of KEYS) {
      const expected = placeholders(translations.en[key]);
      for (const lang of LANGS) {
        expect(placeholders(translations[lang][key]), `${lang}.${key}`).toEqual(expected);
      }
    }
  });

  it("does not leave stray braces in any string", () => {
    for (const lang of LANGS) {
      for (const key of KEYS) {
        const value = translations[lang][key];
        const opens = (value.match(/\{/g) ?? []).length;
        const closes = (value.match(/\}/g) ?? []).length;
        expect(opens, `${lang}.${key}`).toBe(closes);
      }
    }
  });
});

describe("translate", () => {
  it("substitutes named values", () => {
    expect(translate("en", "inARow", { count: 7 })).toBe("7 in a row");
    expect(translate("pl", "inARow", { count: 7 })).toBe("7 z rzędu");
  });

  it("substitutes every placeholder in a multi-value string", () => {
    const result = translate("en", "finishSummary", {
      points: 120,
      correct: 12,
      streak: 7,
    });
    expect(result).toBe("120 points · 12 correct · best streak 7");
    expect(result).not.toMatch(/[{}]/);
  });

  it("leaves an unknown placeholder visible rather than blanking it", () => {
    // Failing loudly beats rendering a sentence with a hole in it.
    expect(translate("en", "inARow", {})).toBe("{count} in a row");
  });

  it("returns the template untouched when no values are given", () => {
    expect(translate("uk", "signIn")).toBe(translations.uk.signIn);
  });

  it("renders every language's every key without leftover placeholders", () => {
    const sample = { count: 1, points: 2, seconds: 3, value: 4, groups: 5, perGroup: 6, correct: 7, total: 8, streak: 9, accuracy: 10, days: 11, missed: 12, name: "Zosia" };
    for (const lang of LANGS) {
      for (const key of KEYS) {
        expect(translate(lang, key, sample), `${lang}.${key}`).not.toMatch(/\{\w+\}/);
      }
    }
  });
});

describe("isLang", () => {
  it("accepts the supported languages and nothing else", () => {
    for (const lang of LANGS) expect(isLang(lang)).toBe(true);
    for (const value of ["de", "", "PL", null, undefined, 42, {}]) {
      expect(isLang(value)).toBe(false);
    }
  });

  it("narrows the type", () => {
    const value: unknown = "uk";
    if (isLang(value)) {
      const lang: Lang = value;
      expect(translations[lang]).toBeDefined();
    }
  });
});
