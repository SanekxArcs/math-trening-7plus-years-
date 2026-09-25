import type { Mood, Species } from "@/engine";
import { SPECIES } from "@/engine";
import { cn } from "@/lib/utils";
import "./pet-art.css";

/**
 * The pets, drawn.
 *
 * SVG, not canvas, and animated with CSS rather than script. On the cheap
 * tablets this runs on that is the difference that matters: a canvas needs a
 * JavaScript loop redrawing every frame for as long as the pet is on screen,
 * while CSS keyframes run without waking the main thread at all, pause
 * themselves in a background tab, and stop entirely under reduced motion. The
 * drawing is a couple of dozen shapes, so it stays sharp at any size and weighs
 * less than one emoji image would.
 *
 * Only the horse is drawn so far; the others fall back to their emoji until
 * they get art of their own.
 */

const HAS_ART: ReadonlySet<Species> = new Set(["horse"]);

export function hasArt(species: Species): boolean {
  return HAS_ART.has(species);
}

interface PetArtProps {
  species: Species;
  /** Drives the face, the pose and the animation. Defaults to a content pet. */
  mood?: Mood;
  /** Mud splats, 0–4: one per quarter of cleanliness lost. */
  mud?: number;
  /** Off for the small avatars: a row of tabs all breathing at once is noise. */
  animated?: boolean;
  className?: string;
}

export function PetArt({ species, mood = "ok", mud = 0, animated = false, className }: PetArtProps) {
  const classes = cn("pet", `mood-${mood}`, !animated && "pet--still", className);

  if (species === "horse") {
    return <Horse className={classes} mood={mood} mud={mud} />;
  }

  // Emoji inside the same 200×200 box, so every call site sizes pets the same
  // way whether or not the species has been drawn yet.
  return (
    <svg viewBox="0 0 200 200" className={classes} aria-hidden>
      <text x="100" y="158" fontSize="150" textAnchor="middle">
        {SPECIES[species].emoji}
      </text>
    </svg>
  );
}

const COAT = "#c98348";
const COAT_DARK = "#a3643a";
const MUZZLE = "#efc49d";
const MANE = "#5c3420";
const HOOF = "#3d2416";
const EYE = "#2a1810";
const MOUTH = "#6b3a22";

/** Where the mud lands, so the splats sit on the body, not in the air. */
const MUD_SPOTS = [
  "M72 112c4-5 12-3 12 3s-7 8-11 6-5-5-1-9z",
  "M108 138c3-4 10-3 11 2s-5 7-9 6-5-4-2-8z",
  "M124 110c3-3 9-2 9 2s-4 6-7 5-4-4-2-7z",
  "M86 142c3-3 8-2 8 2s-4 5-7 4-3-3-1-6z",
];

const SPARKLES: [number, number, number][] = [
  [34, 58, 0],
  [188, 22, 0.6],
  [40, 150, 1.2],
];

function Horse({ className, mood, mud }: { className: string; mood: Mood; mud: number }) {
  const droopy = mood === "sad" || mood === "sick";

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <ellipse className="pet-shadow" cx="100" cy="182" rx="54" ry="7" fill="#000" opacity="0.14" />

      <g className="pet-bob">
        <g className="pet-tail">
          <path
            d="M56 108c-18-9-34 8-31 36 1 14 12 18 15 8-3-14 2-27 20-34z"
            fill={MANE}
          />
          <path d="M44 118c-8 6-11 16-10 26" stroke="#7a4a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>

        {/* The far legs, a shade darker so the near pair reads in front. */}
        <Leg x={68} fill={COAT_DARK} />
        <Leg x={126} fill={COAT_DARK} />

        <g className="pet-body">
          <ellipse cx="100" cy="122" rx="50" ry="30" fill={COAT} />
          <ellipse cx="104" cy="140" rx="28" ry="8" fill={MUZZLE} opacity="0.4" />
          {MUD_SPOTS.slice(0, Math.max(0, Math.min(4, mud))).map((d) => (
            <path key={d} d={d} fill="#6b4423" opacity="0.8" />
          ))}
        </g>

        <Leg x={82} fill={COAT} />
        <Leg x={140} fill={COAT} />

        {/* Neck and mane stay put; only the head nods. */}
        <path d="M116 106c4-20 16-38 32-50l20 16c-9 12-16 28-19 46z" fill={COAT} />
        <path
          d="M152 34c-14-3-22 8-17 18-11 3-13 15-6 21-11 4-13 16-6 22-8 4-9 11-5 15l11-6c4-20 12-40 28-58z"
          fill={MANE}
        />

        <g className="pet-head">
          <path className="pet-ear-far" d="M146 40l1-20 9 16z" fill={COAT_DARK} />
          <g className="pet-ear">
            <path d="M152 38l5-20 7 18z" fill={COAT} />
            <path d="M155 35l2.2-10 3.6 10z" fill={MUZZLE} />
          </g>

          <ellipse cx="158" cy="53" rx="25" ry="21" fill={COAT} />
          <ellipse cx="177" cy="68" rx="16" ry="13" fill={MUZZLE} />
          <ellipse cx="185" cy="65.5" rx="1.8" ry="2.6" fill="#8a5436" />

          <Eye mood={mood} />
          {droopy && <path d="M156 44h12v6c-4-2.5-8-2.5-12 0z" fill={COAT} />}
          {mood === "vacation" && (
            <g>
              <path d="M140 49l14-1" stroke="#1f2937" strokeWidth="2" />
              <rect x="153" y="43" width="18" height="12" rx="5" fill="#1f2937" />
              <path d="M157 46l5 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
            </g>
          )}

          <ellipse
            cx="169"
            cy="60"
            rx="5"
            ry="3"
            fill={mood === "sick" ? "#9bd49b" : "#f08a7e"}
            opacity={mood === "gone" ? 0 : 0.55}
          />
          <Mouth mood={mood} />

          <path d="M150 36c6-8 18-6 20 4-6-3-12 0-14 6-2-4-5-6-6-10z" fill={MANE} />
        </g>

        {mood === "gone" && (
          <ellipse className="pet-halo" cx="156" cy="16" rx="14" ry="4" fill="none" stroke="#facc15" strokeWidth="3" />
        )}
        {mood === "sad" && (
          <path
            className="pet-tear"
            d="M166 58c0 0-4 6-2 9 2 2.5 5 1 4.5-2-.5-3-2.5-7-2.5-7z"
            fill="#60a5fa"
          />
        )}
        {mood === "hungry" && (
          <g className="pet-rumble" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M92 160c3-3 6 3 9 0s6 3 9 0" />
            <path d="M96 166c3-3 6 3 9 0" />
          </g>
        )}
        {mood === "happy" &&
          SPARKLES.map(([x, y, delay]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <path
                className="pet-sparkle"
                style={{ animationDelay: `${delay}s` }}
                d="M0-7l1.8 5.2L7 0l-5.2 1.8L0 7l-1.8-5.2L-7 0l5.2-1.8z"
                fill="#fbbf24"
              />
            </g>
          ))}
      </g>
    </svg>
  );
}

function Leg({ x, fill }: { x: number; fill: string }) {
  return (
    <g>
      <rect x={x} y="128" width="14" height="46" rx="7" fill={fill} />
      <rect x={x - 1} y="166" width="16" height="10" rx="3" fill={HOOF} />
    </g>
  );
}

function Eye({ mood }: { mood: Mood }) {
  if (mood === "happy") {
    return <path d="M157 52q5-7 10 0" stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }
  if (mood === "gone") {
    return <path d="M157 50q5 5 10 0" stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }
  return (
    <g className="pet-eye">
      <ellipse cx="162" cy="49" rx="5.4" ry="6.6" fill={EYE} />
      <circle cx="164" cy="46.4" r="2" fill="#fff" />
      <circle cx="160.6" cy="51.6" r="0.9" fill="#fff" opacity="0.8" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M171 73q7 11 15 0z" fill="#7a2e2e" />
          <ellipse cx="178.5" cy="78" rx="3.4" ry="2" fill="#f28b9b" />
        </g>
      );
    case "hungry":
      return <ellipse cx="178" cy="76" rx="3.4" ry="4" fill="#7a2e2e" />;
    case "sad":
      return <path d="M172 78q6-5 12 0" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />;
    case "sick":
      return (
        <g>
          <path d="M172 77q6-4 12 0" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* A thermometer in the corner of the mouth: poorly, at a glance. */}
          <rect x="180" y="74" width="15" height="3.6" rx="1.8" fill="#fff" stroke="#cbd5e1" strokeWidth="0.8" />
          <circle cx="195" cy="75.8" r="2.6" fill="#ef4444" />
        </g>
      );
    case "gone":
      return <path d="M173 76h10" stroke={MOUTH} strokeWidth="2" strokeLinecap="round" />;
    default:
      return <path d="M172 75q6 5 12 0" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
}
