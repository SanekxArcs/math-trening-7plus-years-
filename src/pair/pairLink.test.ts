import { describe, expect, it } from "vitest";
import { pairUrl, parsePairCode } from "./pairLink";

describe("pairing links", () => {
  it("round-trips a code through its link", () => {
    const url = pairUrl("ABC234", "https://math.example");
    expect(url).toBe("https://math.example/pair?code=ABC234");
    expect(parsePairCode(url)).toBe("ABC234");
  });

  it("takes a bare code, in any case", () => {
    expect(parsePairCode(" abc234 ")).toBe("ABC234");
  });

  it("refuses anything that is not a pairing code", () => {
    expect(parsePairCode("https://example.com/?code=ABC234")).toBeNull();
    expect(parsePairCode("WIFI:S:home;T:WPA;P:secret;;")).toBeNull();
    // O and 0 are not in the alphabet — a code containing them was misread.
    expect(parsePairCode("ABC0O4")).toBeNull();
    expect(parsePairCode("https://math.example/pair?code=ABC")).toBeNull();
  });
});
