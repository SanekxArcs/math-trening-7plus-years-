// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SPECIES_ORDER, accessoriesFor } from "@/engine";
import { PetArt } from "./PetArt";

describe("PetArt", () => {
  it.each(SPECIES_ORDER)("draws the %s, not an emoji", (species) => {
    const art = render(<PetArt species={species} />).container;
    expect(art.querySelector(".pet-head")).not.toBeNull();
    expect(art.querySelector(".pet-body")).not.toBeNull();
    expect(art.querySelector("text")).toBeNull();
  });

  it.each(SPECIES_ORDER)("shows the %s's mood on the drawing itself", (species) => {
    const gone = render(<PetArt species={species} mood="gone" />).container;
    expect(gone.querySelector(".pet-halo")).not.toBeNull();

    const sad = render(<PetArt species={species} mood="sad" />).container;
    expect(sad.querySelector(".pet-tear")).not.toBeNull();
    expect(sad.querySelector(".pet-halo")).toBeNull();
  });

  it("keeps the small avatars still unless asked to move", () => {
    const still = render(<PetArt species="horse" />).container.querySelector("svg");
    expect(still?.classList.contains("pet--still")).toBe(true);

    const moving = render(<PetArt species="horse" animated />).container.querySelector("svg");
    expect(moving?.classList.contains("pet--still")).toBe(false);
  });

  it.each(SPECIES_ORDER)("gives the %s one mud splat per quarter of cleanliness lost, never more than four", (species) => {
    const splats = (mud: number) =>
      render(<PetArt species={species} mud={mud} />).container.querySelectorAll('path[fill="#6b4423"]').length;
    expect(splats(0)).toBe(0);
    expect(splats(2)).toBe(2);
    expect(splats(9)).toBe(4);
  });

  it.each(SPECIES_ORDER)("fits everything in the %s's wardrobe", (species) => {
    for (const item of accessoriesFor(species).filter((each) => each.slot !== "home")) {
      const art = render(<PetArt species={species} worn={{ [item.slot]: item.id }} />).container;
      expect(art.querySelector(`[data-worn="${item.id}"]`), item.id).not.toBeNull();
    }
  });

  it("shows only what is worn", () => {
    const art = render(<PetArt species="cat" worn={{ hat: "crown" }} />).container;
    expect(art.querySelectorAll("[data-worn]")).toHaveLength(1);
  });

  it("marks what is being done to the pet, and bubbles a bath", () => {
    const washed = render(<PetArt species="dog" action="wash" animated />).container;
    expect(washed.querySelector("svg")?.classList.contains("act-wash")).toBe(true);
    expect(washed.querySelector(".pet-bubble")).not.toBeNull();
  });
});
