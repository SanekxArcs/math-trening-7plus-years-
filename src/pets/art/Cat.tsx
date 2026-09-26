import type { Mood } from "@/engine";
import {
  BLUSH,
  FrontEye,
  Halo,
  Lid,
  MudSplats,
  Rumble,
  SICK_BLUSH,
  Shades,
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
 * The cat: an orange tabby sitting up and facing us, chibi-style, with a big
 * round head, a white muzzle and bib, and a long striped tail curling up
 * beside it.
 */

const FUR = "#f4a04a";
const FUR_DARK = "#dc8431";
const STRIPE = "#c4631c";
const CREAM = "#fff5e6";
const PINK = "#f6a3b3";
const NOSE = "#ef8a9e";
const MOUTH = "#8a4527";
const WHISKER = "#b98a6a";

/** The eyes, left and right, and how big they are drawn. */
const EYE_L = 84;
const EYE_R = 116;
const EYE_Y = 70;
const EYE_SIZE = 1.3;

const ANCHORS: Record<"hat" | "face" | "neck" | "wings" | "capeL" | "capeR", Anchor> = {
  hat: { x: 100, y: 42, scale: 0.95 },
  face: { x: 100, y: 70, scale: 16 / 11 },
  neck: { x: 100, y: 110, scale: 1.02 },
  wings: { x: 100, y: 112, scale: 1.55 },
  // The cape is drawn side-on, hanging off one shoulder; from the front it
  // shows on both sides, so it goes on twice, once mirrored.
  capeL: { x: 88, y: 106, rotate: 4, scale: 1.25 },
  capeR: { x: 112, y: 106, rotate: -4, scale: 1.25, flip: true },
};

const MUD_SPOTS = [
  "M66 140c4-5 11-3 11 3s-7 8-10 6-5-5-1-9z",
  "M124 128c3-4 10-3 10 2s-5 7-8 6-5-4-2-8z",
  "M96 124c3-3 8-2 8 2s-4 5-7 4-3-3-1-6z",
  "M128 158c3-3 9-2 9 2s-4 6-7 5-4-4-2-7z",
];

const SPARKLES = [
  [34, 54, 0],
  [168, 34, 0.6],
  [38, 144, 1.2],
] as const;

export function Cat({ mood, mud, worn }: SpeciesArtProps) {
  const droopy = mood === "sad" || mood === "sick";
  const back = worn.back;

  return (
    <>
      <ellipse className="pet-shadow" style={origin(100, 182)} cx="100" cy="182" rx="54" ry="7" fill="#000" opacity="0.14" />

      <g className="pet-bob" style={origin(100, 176)}>
        {/* Wings and cape sit behind the body, poking out on either side. */}
        {back === "wings" && <Wear slot="back" worn={worn} at={ANCHORS.wings} />}
        {back === "cape" && (
          <>
            <Wear slot="back" worn={worn} at={ANCHORS.capeL} />
            <Wear slot="back" worn={worn} at={ANCHORS.capeR} />
          </>
        )}

        {/* A long tail curling up beside the body, ringed with stripes. */}
        <g className="pet-tail" style={origin(128, 168)}>
          <path
            d="M122 170c22 4 42-2 46-22 3-16-6-30-18-32-9-1-14 6-10 12"
            stroke={FUR}
            strokeWidth="13"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M122 170c22 4 42-2 46-22 3-16-6-30-18-32-9-1-14 6-10 12"
            stroke={STRIPE}
            strokeWidth="13"
            fill="none"
            strokeDasharray="5 10"
            strokeDashoffset="-12"
            opacity="0.75"
          />
          <path d="M158 164c6-4 10-10 11-18" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.2" strokeLinecap="round" />
        </g>

        {/* The back feet, tucked in and a shade darker. */}
        <ellipse cx="68" cy="173" rx="12" ry="6" fill={FUR_DARK} />
        <ellipse cx="132" cy="173" rx="12" ry="6" fill={FUR_DARK} />

        <g className="pet-body" style={origin(100, 176)}>
          <path d="M100 96c-26 0-40 34-40 60 0 16 16 20 40 20s40-4 40-20c0-26-14-60-40-60z" fill={FUR} />
          {/* Haunches, bulging out at the sides where the cat sits. */}
          <path d="M62 150c0-14 8-24 18-24 8 8 8 30 2 46-14 0-20-8-20-22z" fill={FUR_DARK} opacity="0.35" />
          <path d="M138 150c0-14-8-24-18-24-8 8-8 30-2 46 14 0 20-8 20-22z" fill={FUR_DARK} opacity="0.35" />
          {/* Tabby stripes down the sides. */}
          <g stroke={STRIPE} strokeWidth="3.4" fill="none" strokeLinecap="round" opacity="0.85">
            <path d="M68 124q7 1 10 6" />
            <path d="M63 138q8 0 12 6" />
            <path d="M132 124q-7 1-10 6" />
            <path d="M137 138q-8 0-12 6" />
            <path d="M64 154q6 0 9 5M136 154q-6 0-9 5" />
          </g>
          {/* The white bib down the chest. */}
          <path d="M100 100c-14 0-20 16-18 34 2 16 8 26 18 26s16-10 18-26c2-18-4-34-18-34z" fill={CREAM} />
          <path d="M92 116q8 4 16 0M93 126q7 3 14 0" stroke="#f1dcc0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <ellipse cx="86" cy="112" rx="14" ry="5" fill="#fff" opacity="0.2" />
          <MudSplats spots={MUD_SPOTS} count={mud} />
        </g>

        {/* Front legs and paws, with white socks and toe lines. */}
        <FrontLeg x={85} />
        <FrontLeg x={115} />

        {mood === "hungry" && <Rumble x={91} y={144} color={MOUTH} />}

        {/* The hunter's sword, slung across the chest from its strap. */}
        {back === "hunterSword" && <Wear slot="back" worn={worn} at={{ x: 100, y: 142, scale: 0.85 }} />}
        <Wear slot="neck" worn={worn} at={ANCHORS.neck} />

        <g className="pet-head" style={origin(100, 104)}>
          <g className="pet-ear" style={origin(74, 48)}>
            <path d="M60 62c-4-16-2-32 4-42 10 4 20 12 28 22z" fill={FUR} />
            <path d="M66 52c-2-10-1-19 2-25 6 3 12 8 16 14z" fill={PINK} />
            <path d="M68 44l4-4M69 50l5-3" stroke={CREAM} strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
          </g>
          <g className="pet-ear-alt" style={origin(126, 48)}>
            <path d="M140 62c4-16 2-32-4-42-10 4-20 12-28 22z" fill={FUR} />
            <path d="M134 52c2-10 1-19-2-25-6 3-12 8-16 14z" fill={PINK} />
            <path d="M132 44l-4-4M131 50l-5-3" stroke={CREAM} strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
          </g>

          {/* A wide round head, with fluffy tufts at the cheeks. */}
          <path
            d="M100 36c28 0 44 16 44 36 0 6 3 10 6 14-5 1-8 2-10 5 0 2-1 3-3 4-8 9-22 13-37 13s-29-4-37-13c-2-1-3-2-3-4-2-3-5-4-10-5 3-4 6-8 6-14 0-20 16-36 44-36z"
            fill={FUR}
          />
          <path d="M60 94c10 10 24 14 40 14s30-4 40-14" stroke={FUR_DARK} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
          <ellipse cx="88" cy="46" rx="18" ry="6" fill="#fff" opacity="0.16" />

          {/* The tabby "M" on the forehead and stripes on the cheeks. */}
          <g stroke={STRIPE} strokeWidth="3.4" fill="none" strokeLinecap="round">
            <path d="M100 38v13" />
            <path d="M90 40q-2 6 1 11M110 40q2 6-1 11" />
            <path d="M58 72h9M60 80l8-1M142 72h-9M140 80l-8-1" />
          </g>

          {/* White muzzle and chin. */}
          <ellipse cx="91" cy="87" rx="11" ry="9" fill={CREAM} />
          <ellipse cx="109" cy="87" rx="11" ry="9" fill={CREAM} />
          <ellipse cx="100" cy="95" rx="9" ry="7" fill={CREAM} />
          {/* Whisker dots. */}
          <g fill={WHISKER}>
            <circle cx="88" cy="86" r="0.9" />
            <circle cx="85" cy="89" r="0.9" />
            <circle cx="112" cy="86" r="0.9" />
            <circle cx="115" cy="89" r="0.9" />
          </g>

          <ellipse cx="70" cy="86" rx="6" ry="3.6" fill={mood === "sick" ? SICK_BLUSH : BLUSH} opacity={mood === "gone" ? 0 : 0.55} />
          <ellipse cx="130" cy="86" rx="6" ry="3.6" fill={mood === "sick" ? SICK_BLUSH : BLUSH} opacity={mood === "gone" ? 0 : 0.55} />

          <FrontEye x={EYE_L} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          <FrontEye x={EYE_R} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          {droopy && (
            <>
              <Lid x={EYE_L} y={EYE_Y} fur={FUR} size={EYE_SIZE} />
              <Lid x={EYE_R} y={EYE_Y} fur={FUR} size={EYE_SIZE} />
            </>
          )}

          {/* A little pink nose. */}
          <path d="M94.5 79h11c1 0 1.4 1 .8 1.8L101 85.4c-.6.6-1.4.6-2 0l-5.3-4.6c-.6-.8-.2-1.8.8-1.8z" fill={NOSE} />
          <ellipse cx="98" cy="80.4" rx="2" ry="0.9" fill="#fff" opacity="0.6" />
          <CatMouth mood={mood} />

          {/* Whiskers, three a side. */}
          <g stroke={WHISKER} strokeWidth="1.3" fill="none" strokeLinecap="round">
            <path d="M80 86q-12-3-24-2M80 90q-12 0-25 3M81 94q-10 2-21 8" />
            <path d="M120 86q12-3 24-2M120 90q12 0 25 3M119 94q10 2 21 8" />
          </g>

          {mood === "sad" && <Tear x={EYE_L - 3} y={EYE_Y + 8} />}
          {mood === "vacation" && !worn.face && (
            <g transform={`translate(100 ${EYE_Y}) scale(1.5)`}>
              <Shades x={0} y={0} width={38} />
            </g>
          )}

          <Wear slot="face" worn={worn} at={ANCHORS.face} />
          <Wear slot="hat" worn={worn} at={ANCHORS.hat} />
        </g>

        {mood === "asleep" && <Zzz x={138} y={34} />}
        {mood === "gone" && <Halo x={100} y={12} />}
        {mood === "happy" && <Sparkles points={SPARKLES} />}
      </g>
    </>
  );
}

function FrontLeg({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 8} y="132" width="16" height="42" rx="8" fill={FUR} />
      <path d={`M${x - 5} 144q5 2 10 0M${x - 5} 152q5 2 10 0`} stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.7" />
      <ellipse cx={x} cy="171" rx="10.5" ry="6.5" fill={CREAM} />
      <path d={`M${x - 3.5} 167.5v4.5M${x + 3.5} 167.5v4.5`} stroke="#e2c6a4" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

function CatMouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M100 85.5v2" stroke={MOUTH} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M91 88q9 13 18 0z" fill="#7a2e2e" />
          <ellipse cx="100" cy="94" rx="4.4" ry="2.4" fill="#f28b9b" />
        </g>
      );
    case "hungry":
      return (
        <g>
          <path d="M100 85.5v2" stroke={MOUTH} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="100" cy="93" rx="4" ry="4.6" fill="#7a2e2e" />
          <ellipse cx="100" cy="95" rx="2.4" ry="1.6" fill="#f28b9b" />
        </g>
      );
    case "sad":
      return <path d="M100 85.5v3M93 94q7-6 14 0" stroke={MOUTH} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case "sick":
      return (
        <g>
          <path d="M100 85.5v3M93 93q7-5 14 0" stroke={MOUTH} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <Thermometer x={105} y={92} />
        </g>
      );
    case "gone":
      return <path d="M100 85.5v3M94 91h12" stroke={MOUTH} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    default:
      // The little "w" of a cat's mouth.
      return <path d="M100 85.5v2.5M100 88q-3 4-7 1.5M100 88q3 4 7 1.5" stroke={MOUTH} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  }
}
