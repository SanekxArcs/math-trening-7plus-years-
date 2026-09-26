import type { Mood } from "@/engine";
import { AccessoryShape } from "./accessories";
import {
  BLUSH,
  EYE,
  Halo,
  MudSplats,
  Rumble,
  SICK_BLUSH,
  Sparkles,
  Tear,
  Thermometer,
  Wear,
  Zzz,
  origin,
  type Anchor,
  type SpeciesArtProps,
} from "./parts";

/**
 * The horse, side-on and facing right, and the unicorn drawn on the same
 * bones: a pale coat, a rainbow mane and a horn.
 */

interface Palette {
  coat: string;
  coatDark: string;
  muzzle: string;
  /** The mane and tail, and the strands picked out in them. */
  mane: string;
  strands: readonly string[];
  hoof: string;
  hoofShine: string;
  /** White markings: the blaze down the face and the socks. */
  marking: string;
  mouth: string;
  nostril: string;
}

const HORSE: Palette = {
  coat: "#c98348",
  coatDark: "#a3643a",
  muzzle: "#efc49d",
  mane: "#5c3420",
  strands: ["#7a4a2e", "#7a4a2e", "#7a4a2e"],
  hoof: "#3d2416",
  hoofShine: "#6b4a36",
  marking: "#fbf1e4",
  mouth: "#6b3a22",
  nostril: "#8a5436",
};

const UNICORN: Palette = {
  coat: "#f6f1ff",
  coatDark: "#ddd3f3",
  muzzle: "#fde2ef",
  mane: "#f9a8d4",
  strands: ["#c4b5fd", "#7dd3fc", "#fde68a"],
  hoof: "#a78bfa",
  hoofShine: "#ddd6fe",
  marking: "#ffffff",
  mouth: "#9d4b73",
  nostril: "#d8a1bf",
};

const ANCHORS: Record<"hat" | "face" | "neck" | "back" | "cape" | "sword", Anchor> = {
  hat: { x: 153, y: 31, rotate: 14, scale: 0.7 },
  face: { x: 162, y: 49, scale: 0.78, profile: true },
  neck: { x: 141, y: 96, rotate: 34, scale: 0.9 },
  back: { x: 100, y: 93 },
  sword: { x: 98, y: 96, rotate: 46, scale: 1 },
  cape: { x: 124, y: 96, rotate: -8, scale: 1.1 },
};

const MUD_SPOTS = [
  "M72 112c4-5 12-3 12 3s-7 8-11 6-5-5-1-9z",
  "M108 138c3-4 10-3 11 2s-5 7-9 6-5-4-2-8z",
  "M124 110c3-3 9-2 9 2s-4 6-7 5-4-4-2-7z",
  "M86 142c3-3 8-2 8 2s-4 5-7 4-3-3-1-6z",
];

const SPARKLES = [
  [34, 58, 0],
  [188, 22, 0.6],
  [40, 150, 1.2],
] as const;

const GLITTER = [
  [22, 96, 0.3],
  [180, 104, 1.1],
  [120, 24, 1.8],
] as const;

export function Horse(props: SpeciesArtProps) {
  return <HorseLike {...props} palette={HORSE} />;
}

export function Unicorn(props: SpeciesArtProps) {
  return <HorseLike {...props} palette={UNICORN} unicorn />;
}

function HorseLike({ mood, mud, worn, palette: p, unicorn = false }: SpeciesArtProps & { palette: Palette; unicorn?: boolean }) {
  const droopy = mood === "sad" || mood === "sick";
  const back = worn.back;

  return (
    <>
      <ellipse className="pet-shadow" style={origin(100, 182)} cx="100" cy="182" rx="56" ry="7" fill="#000" opacity="0.14" />

      <g className="pet-bob" style={origin(100, 176)}>
        {/* A cape hangs behind everything but the tail; wings rise from behind the back. */}
        {back === "wings" && <Wear slot="back" worn={worn} at={{ x: 104, y: 96, scale: 1.1 }} />}

        <g className="pet-tail" style={origin(56, 110)}>
          <path d="M58 106c-20-10-38 8-35 38 1 15 13 20 17 9-4-15 1-28 20-36z" fill={p.mane} />
          <path d="M46 116c-9 7-13 18-12 29" stroke={p.strands[0]} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M52 114c-8 8-10 18-8 30" stroke={p.strands[1]} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M40 124c-4 8-4 16-1 22" stroke={p.strands[2]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>

        {/* The far legs, a shade darker so the near pair reads in front. */}
        <Leg x={68} fill={p.coatDark} hoof={p.hoof} shine={p.hoofShine} />
        <Leg x={126} fill={p.coatDark} hoof={p.hoof} shine={p.hoofShine} />

        <g className="pet-body" style={origin(100, 150)}>
          <ellipse cx="100" cy="122" rx="50" ry="30" fill={p.coat} />
          {/* Belly, shoulder and haunch: enough shading to give it a shape. */}
          <ellipse cx="104" cy="140" rx="30" ry="9" fill={p.muzzle} opacity="0.45" />
          <path d="M60 104c-8 10-9 26-2 36" stroke={p.coatDark} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
          <path d="M136 106c7 8 9 20 5 30" stroke={p.coatDark} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
          <ellipse cx="88" cy="104" rx="22" ry="6" fill="#fff" opacity="0.14" />
          <MudSplats spots={MUD_SPOTS} count={mud} />
          {back === "saddle" && <Wear slot="back" worn={worn} at={ANCHORS.back} />}
          {back === "cape" && <Wear slot="back" worn={worn} at={ANCHORS.cape} />}
          {back === "hunterSword" && <Wear slot="back" worn={worn} at={ANCHORS.sword} />}
        </g>

        <Leg x={82} fill={p.coat} hoof={p.hoof} shine={p.hoofShine} sock={p.marking} />
        <Leg x={140} fill={p.coat} hoof={p.hoof} shine={p.hoofShine} sock={p.marking} />

        {/* Neck and mane stay put; only the head nods. */}
        <path d="M116 106c4-20 16-38 32-50l20 16c-9 12-16 28-19 46z" fill={p.coat} />
        <path d="M150 70c-8 12-13 26-15 40" stroke={p.coatDark} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
        <path
          d="M152 34c-14-3-22 8-17 18-11 3-13 15-6 21-11 4-13 16-6 22-8 4-9 11-5 15l11-6c4-20 12-40 28-58z"
          fill={p.mane}
        />
        <path d="M146 40c-8 2-10 10-6 15M136 58c-7 3-8 11-4 15M128 78c-6 3-6 10-3 13" stroke={p.strands[0]} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M150 46c-6 6-10 14-12 22M138 74c-3 6-6 14-7 20" stroke={p.strands[1]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {unicorn && <path d="M143 52c-4 6-7 12-8 18" stroke={p.strands[2]} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
        <Wear slot="neck" worn={worn} at={ANCHORS.neck} />

        <g className="pet-head" style={origin(150, 74)}>
          <path className="pet-ear-far" d="M146 40l1-20 9 16z" fill={p.coatDark} />
          <g className="pet-ear" style={origin(158, 37)}>
            <path d="M152 38l5-20 7 18z" fill={p.coat} />
            <path d="M155 35l2.2-10 3.6 10z" fill={p.muzzle} />
          </g>

          <ellipse cx="158" cy="53" rx="25" ry="21" fill={p.coat} />
          {/* The jaw, a shade darker under the cheek. */}
          <path d="M140 62c4 9 14 14 26 13" stroke={p.coatDark} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
          <ellipse cx="177" cy="68" rx="16" ry="13" fill={p.muzzle} />
          {/* The blaze runs from the forehead down the front of the face. */}
          <path d="M168 38c5 4 9 12 12 20 1 3 0 6-3 5-3-7-7-15-12-21z" fill={p.marking} opacity="0.9" />
          <path d="M183 63c2-1 4 0 4 2.5s-2 3.6-3.6 2.4" stroke={p.nostril} strokeWidth="2" fill="none" strokeLinecap="round" />

          <HorseEye mood={mood} />
          {droopy && <path d="M156 42h13v7c-4.5-2.6-8.5-2.6-13 0z" fill={p.coat} />}
          {mood === "vacation" && !worn.face && (
            <g transform="translate(162 49) scale(0.8)">
              <AccessoryShape id="sunglasses" profile />
            </g>
          )}

          <ellipse
            cx="168"
            cy="61"
            rx="5"
            ry="3"
            fill={mood === "sick" ? SICK_BLUSH : BLUSH}
            opacity={mood === "gone" ? 0 : 0.55}
          />
          <HorseMouth mood={mood} color={p.mouth} />

          <path d="M150 36c6-8 18-6 20 4-6-3-12 0-14 6-2-4-5-6-6-10z" fill={p.mane} />
          <path d="M156 34c4-2 9-1 11 3" stroke={p.strands[1]} strokeWidth="1.6" fill="none" strokeLinecap="round" />

          <Wear slot="face" worn={worn} at={ANCHORS.face} />
          <Wear slot="hat" worn={worn} at={unicorn ? { ...ANCHORS.hat, x: 150, y: 33, rotate: 8 } : ANCHORS.hat} />
          {/* The horn goes through whatever hat is on: it is a unicorn first. */}
          {unicorn && <Horn />}
        </g>

        {mood === "asleep" && <Zzz x={176} y={30} />}
        {mood === "gone" && <Halo x={156} y={16} />}
        {mood === "sad" && <Tear x={166} y={58} />}
        {mood === "hungry" && <Rumble x={92} y={160} color={p.mouth} />}
        {mood === "happy" && <Sparkles points={SPARKLES} />}
        {unicorn && mood !== "gone" && mood !== "asleep" && <Sparkles points={GLITTER} color="#f0abfc" />}
      </g>
    </>
  );
}

function Leg({ x, fill, hoof, shine, sock }: { x: number; fill: string; hoof: string; shine: string; sock?: string }) {
  return (
    <g>
      <rect x={x} y="128" width="14" height="46" rx="7" fill={fill} />
      {sock && <rect x={x} y="152" width="14" height="16" rx="5" fill={sock} />}
      <rect x={x - 1} y="166" width="16" height="10" rx="3" fill={hoof} />
      <path d={`M${x + 2} ${169}h8`} stroke={shine} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/** A spiralled golden horn, leaning forward off the forehead. */
function Horn() {
  return (
    <g>
      <path d="M160 34l14-30 -2 33z" fill="#fcd34d" />
      <path d="M161.5 30.5l11-1.6M164 24.5l9-1.4M166.6 18.6l6.4-1M169.2 12.8l4-.6" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M163 32l9-24" stroke="#fef3c7" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

function HorseEye({ mood }: { mood: Mood }) {
  if (mood === "asleep") {
    // Closed and content: a lash line, curved down, with a little lash.
    return (
      <g stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round">
        <path d="M156 50q6 5 12 0" />
        <path d="M158 53l-2 3" strokeWidth="1.8" />
      </g>
    );
  }
  if (mood === "happy") {
    return <path d="M157 52q5-7 10 0" stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }
  if (mood === "gone") {
    return <path d="M157 50q5 5 10 0" stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }
  return (
    <g className="pet-eye" style={origin(162, 50)}>
      <ellipse cx="162" cy="49" rx="5.4" ry="6.6" fill={EYE} />
      <circle cx="164" cy="46.4" r="2" fill="#fff" />
      <circle cx="160.6" cy="51.6" r="0.9" fill="#fff" opacity="0.8" />
      {/* Lashes, flicking back towards the ear. */}
      <path d="M157 44l-3-2.4M159.4 42.6l-1.6-3" stroke={EYE} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

function HorseMouth({ mood, color }: { mood: Mood; color: string }) {
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
      return <path d="M172 78q6-5 12 0" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />;
    case "sick":
      return (
        <g>
          <path d="M172 77q6-4 12 0" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
          <Thermometer x={180} y={75.8} />
        </g>
      );
    case "gone":
      return <path d="M173 76h10" stroke={color} strokeWidth="2" strokeLinecap="round" />;
    default:
      return <path d="M172 75q6 5 12 0" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
}
