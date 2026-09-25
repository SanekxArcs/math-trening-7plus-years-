// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PetArt, hasArt } from "./PetArt";

describe("PetArt", () => {
  it("draws the horse and falls back to emoji for the rest", () => {
    expect(hasArt("horse")).toBe(true);
    expect(hasArt("cat")).toBe(false);

    const horse = render(<PetArt species="horse" />).container;
    expect(horse.querySelector(".pet-head")).not.toBeNull();
    expect(horse.textContent).toBe("");

    const cat = render(<PetArt species="cat" />).container;
    expect(cat.querySelector("text")?.textContent).toBe("🐈");
  });

  it("shows the mood on the drawing itself", () => {
    const gone = render(<PetArt species="horse" mood="gone" />).container;
    expect(gone.querySelector(".pet-halo")).not.toBeNull();

    const sad = render(<PetArt species="horse" mood="sad" />).container;
    expect(sad.querySelector(".pet-tear")).not.toBeNull();
    expect(sad.querySelector(".pet-halo")).toBeNull();
  });

  it("keeps the small avatars still unless asked to move", () => {
    const still = render(<PetArt species="horse" />).container.querySelector("svg");
    expect(still?.classList.contains("pet--still")).toBe(true);

    const moving = render(<PetArt species="horse" animated />).container.querySelector("svg");
    expect(moving?.classList.contains("pet--still")).toBe(false);
  });

  it("draws one mud splat per quarter of cleanliness lost, never more than four", () => {
    const splats = (mud: number) =>
      render(<PetArt species="horse" mud={mud} />).container.querySelectorAll('path[fill="#6b4423"]').length;
    expect(splats(0)).toBe(0);
    expect(splats(2)).toBe(2);
    expect(splats(9)).toBe(4);
  });
});
