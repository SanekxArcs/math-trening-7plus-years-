import type { CSSProperties } from "react";
import type { Mood, Slot, Worn } from "@/engine";
import { AccessoryShape } from "./accessories";

/**
 * The pieces every species is drawn from, and the contract between them.
 *
 * A species component returns the contents of a 200×200 box (PetArt owns the
 * <svg> around it) and follows three rules:
 *
 * 1. Moving parts carry one of the class names animated in pet-art.css
 *    (`pet-bob`, `pet-body`, `pet-head`, `pet-tail`, `pet-eye`, `pet-ear`, …)
 *    and say where they pivot with `origin(x, y)` — a point in the drawing's
 *    own coordinates, so the numbers can be read off the shapes around them.
 * 2. A moving part never carries an SVG `transform` attribute of its own: the
 *    CSS animation replaces it. Anything that needs placing is wrapped in a
 *    <g> that does the placing.
 * 3. Accessories go on with <Wear>, inside the part they should move with —
 *    a hat inside the head, so it nods with it.
 */

export interface SpeciesArtProps {
  mood: Mood;
  /** Mud splats, 0–4. */
  mud: number;
  worn: Worn;
}

/** Where an accessory sits on a species, as a transform of its unit drawing. */
export interface Anchor {
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  /** Side-on face: glasses draw as one lens rather than a pair. */
  profile?: boolean;
  /** Mirror the drawing, for a pet facing the other way. */
  flip?: boolean;
}

export function origin(x: number, y: number): CSSProperties {
  return { transformOrigin: `${x}px ${y}px` };
}

export const EYE = "#2a1810";
export const MUD = "#6b4423";
export const TEAR = "#60a5fa";
export const BLUSH = "#f08a7e";
export const SICK_BLUSH = "#9bd49b";

export function placed(at: Anchor): string {
  const flip = at.flip ? " scale(-1 1)" : "";
  return `translate(${at.x} ${at.y}) rotate(${at.rotate ?? 0}) scale(${at.scale ?? 1})${flip}`;
}

/** An accessory from the wardrobe, if one is worn in this slot. */
export function Wear({ slot, worn, at }: { slot: Exclude<Slot, "home">; worn: Worn; at: Anchor }) {
  const id = worn[slot];
  if (!id) return null;
  return (
    <g transform={placed(at)} data-worn={id}>
      <AccessoryShape id={id} profile={at.profile} />
    </g>
  );
}

/** One splat per quarter of cleanliness lost, where the species says they land. */
export function MudSplats({ spots, count }: { spots: readonly string[]; count: number }) {
  return (
    <>
      {spots.slice(0, Math.max(0, Math.min(4, count))).map((d) => (
        <path key={d} d={d} fill={MUD} opacity="0.8" />
      ))}
    </>
  );
}

/** Three z's drifting up and away, one after another. */
export function Zzz({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#8b7cf6" fontWeight="900" fontFamily="system-ui, sans-serif">
      {[0, 1, 2].map((i) => (
        <text
          key={i}
          className="pet-z"
          x={i * 8}
          y={-i * 11}
          style={{ animationDelay: `${i * 0.9}s` }}
          fontSize={14 + i * 5}
        >
          z
        </text>
      ))}
    </g>
  );
}

export function Halo({ x, y }: { x: number; y: number }) {
  return (
    <ellipse
      className="pet-halo"
      style={origin(x, y)}
      cx={x}
      cy={y}
      rx="14"
      ry="4"
      fill="none"
      stroke="#facc15"
      strokeWidth="3"
    />
  );
}

/** A tear running down from just under an eye. */
export function Tear({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="pet-tear"
      d={`M${x} ${y}c0 0-4 6-2 9 2 2.5 5 1 4.5-2-.5-3-2.5-7-2.5-7z`}
      fill={TEAR}
    />
  );
}

/** A tummy rumbling, drawn as two wavy lines under the belly. */
export function Rumble({ x, y, color = "#6b3a22" }: { x: number; y: number; color?: string }) {
  return (
    <g className="pet-rumble" style={origin(x + 9, y + 3)} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round">
      <path d={`M${x} ${y}c3-3 6 3 9 0s6 3 9 0`} />
      <path d={`M${x + 4} ${y + 6}c3-3 6 3 9 0`} />
    </g>
  );
}

const STAR = "M0-7l1.8 5.2L7 0l-5.2 1.8L0 7l-1.8-5.2L-7 0l5.2-1.8z";

/** Twinkles around a happy pet. Each point is [x, y, delay in seconds]. */
export function Sparkles({ points, color = "#fbbf24" }: { points: readonly (readonly [number, number, number])[]; color?: string }) {
  return (
    <>
      {points.map(([x, y, delay]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path className="pet-sparkle" style={{ animationDelay: `${delay}s` }} d={STAR} fill={color} />
        </g>
      ))}
    </>
  );
}

/** A thermometer poking out of a poorly mouth, pointing along +x from (x, y). */
export function Thermometer({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`}>
      <rect x="0" y="-1.8" width="15" height="3.6" rx="1.8" fill="#fff" stroke="#cbd5e1" strokeWidth="0.8" />
      <circle cx="15" cy="0" r="2.6" fill="#ef4444" />
    </g>
  );
}

/**
 * A front-facing eye in every mood: open with a shine, happy arcs, closed and
 * content asleep, soft and shut when gone. Blinks on its own when open.
 */
export function FrontEye({ x, y, mood, size = 1 }: { x: number; y: number; mood: Mood; size?: number }) {
  const w = 5 * size;
  if (mood === "asleep") {
    return (
      <path d={`M${x - w} ${y}q${w} ${w} ${w * 2} 0`} stroke={EYE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    );
  }
  if (mood === "happy") {
    return (
      <path d={`M${x - w} ${y + 1}q${w} ${-w * 1.4} ${w * 2} 0`} stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round" />
    );
  }
  if (mood === "gone") {
    return (
      <path d={`M${x - w} ${y - 1}q${w} ${w} ${w * 2} 0`} stroke={EYE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    );
  }
  return (
    <g className="pet-eye" style={origin(x, y)}>
      <ellipse cx={x} cy={y} rx={5 * size} ry={6.2 * size} fill={EYE} />
      <circle cx={x + 1.8 * size} cy={y - 2.6 * size} r={2 * size} fill="#fff" />
      <circle cx={x - 1.6 * size} cy={y + 2.4 * size} r={0.9 * size} fill="#fff" opacity="0.8" />
    </g>
  );
}

/**
 * Heavy lids for a sad or poorly pet, painted in the fur colour over the top
 * of an open eye.
 */
export function Lid({ x, y, fur, size = 1 }: { x: number; y: number; fur: string; size?: number }) {
  const w = 6.4 * size;
  return <path d={`M${x - w} ${y - 7 * size}h${w * 2}v${6 * size}c${-w * 0.7}-${2.6 * size} ${-w * 1.3}-${2.6 * size} ${-w * 2} 0z`} fill={fur} />;
}

/** Holiday shades, for a pet not already wearing glasses. */
export function Shades({ x, y, width = 34 }: { x: number; y: number; width?: number }) {
  const half = width / 2;
  return (
    <g>
      <rect x={x - half} y={y - 5} width={half - 2} height="10" rx="4" fill="#1f2937" />
      <rect x={x + 2} y={y - 5} width={half - 2} height="10" rx="4" fill="#1f2937" />
      <path d={`M${x - 2} ${y - 2}h4`} stroke="#1f2937" strokeWidth="2" />
      <path d={`M${x - half + 3} ${y - 2}l4 0M${x + 5} ${y - 2}l4 0`} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </g>
  );
}
