import type { ComponentType } from "react";
import type { Mood, Species, Worn } from "@/engine";
import { cn } from "@/lib/utils";
import type { SpeciesArtProps } from "./art/parts";
import { Horse, Unicorn } from "./art/Horse";
import { Cat } from "./art/Cat";
import { Dog } from "./art/Dog";
import { Bunny } from "./art/Bunny";
import { Tiger } from "./art/Tiger";
import "./pet-art.css";

/**
 * The pets, drawn.
 *
 * SVG, not canvas, and animated with CSS rather than script. On the cheap
 * tablets this runs on that is the difference that matters: a canvas needs a
 * JavaScript loop redrawing every frame for as long as the pet is on screen,
 * while CSS keyframes run without waking the main thread at all, pause
 * themselves in a background tab, and stop entirely under reduced motion. Each
 * drawing is a few dozen shapes, so it stays sharp at any size and weighs less
 * than one emoji image would.
 *
 * Every species follows the same contract (see art/parts.tsx), which is what
 * lets one set of accessories fit them all.
 */

const ART: Record<Species, ComponentType<SpeciesArtProps>> = {
  horse: Horse,
  cat: Cat,
  dog: Dog,
  bunny: Bunny,
  unicorn: Unicorn,
  tiger: Tiger,
};

/** Something just done to the pet, played once over its usual animation. */
export type PetAction = "eat" | "wash" | "cheer";

interface PetArtProps {
  species: Species;
  /** Drives the face, the pose and the animation. Defaults to a content pet. */
  mood?: Mood;
  /** Mud splats, 0–4: one per quarter of cleanliness lost. */
  mud?: number;
  worn?: Worn;
  action?: PetAction | null;
  /** Off for the small avatars: a row of tabs all breathing at once is noise. */
  animated?: boolean;
  className?: string;
}

const NOTHING_WORN: Worn = {};

export function PetArt({
  species,
  mood = "ok",
  mud = 0,
  worn = NOTHING_WORN,
  action = null,
  animated = false,
  className,
}: PetArtProps) {
  const Art = ART[species];
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("pet", `pet-${species}`, `mood-${mood}`, action && `act-${action}`, !animated && "pet--still", className)}
      aria-hidden
    >
      <Art mood={mood} mud={mud} worn={worn} />
      {action === "wash" && <Bubbles />}
    </svg>
  );
}

const BUBBLES = [
  [60, 120, 7, 0],
  [96, 104, 10, 0.15],
  [132, 126, 6, 0.3],
  [150, 70, 8, 0.1],
  [78, 146, 5, 0.4],
  [118, 92, 6, 0.5],
  [44, 96, 5, 0.25],
] as const;

/** Soap bubbles rising off a pet being washed. */
function Bubbles() {
  return (
    <g>
      {BUBBLES.map(([x, y, r, delay]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <g className="pet-bubble" style={{ animationDelay: `${delay}s` }}>
            <circle r={r} fill="#e0f2fe" fillOpacity="0.55" stroke="#7dd3fc" strokeWidth="1.2" />
            <circle cx={-r * 0.35} cy={-r * 0.35} r={r * 0.25} fill="#fff" />
          </g>
        </g>
      ))}
    </g>
  );
}
