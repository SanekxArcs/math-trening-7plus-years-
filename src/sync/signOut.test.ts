// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/convex", () => ({ convex: null }));

const { signOutDevice } = await import("./signOut");

describe("signOutDevice", () => {
  it("clears everything the child left on this device, keeps the language, and starts over", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, assign } });
    for (const key of ["math_master_stable", "math_master_level", "math_master_session", "math_master_parent_session"]) {
      localStorage.setItem(key, "{}");
    }
    localStorage.setItem("math_master_lang", "pl");
    localStorage.setItem("someone_else", "kept");

    await signOutDevice(null, null);

    expect(localStorage.getItem("math_master_stable")).toBeNull();
    expect(localStorage.getItem("math_master_level")).toBeNull();
    expect(localStorage.getItem("math_master_session")).toBeNull();
    expect(localStorage.getItem("math_master_parent_session")).toBeNull();
    expect(localStorage.getItem("math_master_lang")).toBe("pl");
    expect(localStorage.getItem("someone_else")).toBe("kept");
    expect(assign).toHaveBeenCalledWith("/");
  });
});
