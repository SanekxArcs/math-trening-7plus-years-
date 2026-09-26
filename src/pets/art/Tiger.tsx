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
 * The tiger: a goofy, chunky blue tiger sitting up and facing us, chibi-style,
 * with a big round head, little round ears, bold navy stripes, a white muzzle
 * and tummy, and a huge silly grin. Its long striped tail curls up on the
 * left, the other way from the cat's.
 */

const FUR = "#6ea0f5";
const FUR_DARK = "#4f82e0";
const STRIPE = "#1e3a8a";
const CREAM = "#f6f9ff";
const EAR_IN = "#dbe7ff";
const NOSE = "#ef7f9f";
const MOUTH = "#1e2a5e";
const MOUTH_IN = "#7a2440";
const TONGUE = "#f28b9b";
const WHISKER = "#2f4a9a";

/** The eyes, left and right, and how big they are drawn. */
const EYE_L = 83;
const EYE_R = 117;
const EYE_Y = 64;
const EYE_SIZE = 1.45;

const ANCHORS: Record<"hat" | "headset" | "face" | "neck" | "wings" | "capeL" | "capeR" | "sword", Anchor> = {
  hat: { x: 100, y: 38, scale: 1.12 },
  // The headset hugs the sides of the big head, so the boom reaches the grin.
  headset: { x: 100, y: 44, scale: 1.55 },
  face: { x: 100, y: EYE_Y, scale: 17 / 11 },
  neck: { x: 100, y: 116, scale: 1.15 },
  wings: { x: 100, y: 114, scale: 1.7 },
  // The cape is drawn side-on, hanging off one shoulder; from the front it
  // shows on both sides, so it goes on twice, once mirrored.
  capeL: { x: 86, y: 110, rotate: 6, scale: 1.35 },
  capeR: { x: 114, y: 110, rotate: -6, scale: 1.35, flip: true },
  sword: { x: 100, y: 142, scale: 0.95 },
};

const MUD_SPOTS = [
  "M58 138c4-5 11-3 11 3s-7 8-10 6-5-5-1-9z",
  "M128 124c3-4 10-3 10 2s-5 7-8 6-5-4-2-8z",
  "M95 118c3-3 8-2 8 2s-4 5-7 4-3-3-1-6z",
  "M132 154c3-3 9-2 9 2s-4 6-7 5-4-4-2-7z",
];

const SPARKLES = [
  [30, 52, 0],
  [172, 32, 0.6],
  [170, 146, 1.2],
] as const;

/** A tapered tiger stripe: from a wide base between two points to a tip. */
const HEAD_STRIPES = [
  // Forehead: a tall one down the middle and a pair either side of it.
  "M94.5 31q5 9 5.5 18 .5-9 5.5-18q-5.5-1-11 0z",
  "M80 35q6 6 8 14 0-8-1.5-16z",
  "M120 35q-6 6-8 14 0-8 1.5-16z",
  "M69 42q5 4 7 10 .5-6-1-12z",
  "M131 42q-5 4-7 10-.5-6 1-12z",
  // Cheeks: three wedges pointing in towards the nose.
  "M49 70q8-1 14 4-7 1-15 3z",
  "M47 80q9 0 15 4-8 2-15 3z",
  "M151 70q-8-1-14 4 7 1 15 3z",
  "M153 80q-9 0-15 4 8 2 15 3z",
];

const BODY_STRIPES = [
  "M60 122q9 1 15 8-9 0-17-2z",
  "M56 138q10 1 16 8-9-1-17-2z",
  "M55 154q9 1 13 7-7-1-13-1z",
  "M140 122q-9 1-15 8 9 0 17-2z",
  "M144 138q-10 1-16 8 9-1 17-2z",
  "M145 154q-9 1-13 7 7-1 13-1z",
];

export function Tiger({ mood, mud, worn }: SpeciesArtProps) {
  const droopy = mood === "sad" || mood === "sick";
  const back = worn.back;

  return (
    <>
      <ellipse className="pet-shadow" style={origin(100, 182)} cx="100" cy="182" rx="58" ry="7" fill="#000" opacity="0.14" />

      <g className="pet-bob" style={origin(100, 176)}>
        {/* Wings and cape sit behind the body, poking out on either side. */}
        {back === "wings" && <Wear slot="back" worn={worn} at={ANCHORS.wings} />}
        {back === "cape" && (
          <>
            <Wear slot="back" worn={worn} at={ANCHORS.capeL} />
            <Wear slot="back" worn={worn} at={ANCHORS.capeR} />
          </>
        )}

        {/* A long, thick tail curling up beside the body, ringed in navy. */}
        <g className="pet-tail" style={origin(74, 168)}>
          <path
            d="M78 170c-24 4-46-4-48-26-1-14 6-26 16-30 6-2 12 0 14 4"
            stroke={FUR}
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M78 170c-24 4-46-4-48-26-1-14 6-26 16-30"
            stroke={STRIPE}
            strokeWidth="14"
            fill="none"
            strokeDasharray="5 11"
            strokeDashoffset="-14"
            opacity="0.85"
          />
          <path d="M46 114c6-2 12 0 14 4" stroke={STRIPE} strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M38 158c-5-5-8-11-8-18" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.2" strokeLinecap="round" />
        </g>

        {/* The back feet, tucked in and a shade darker. */}
        <ellipse cx="64" cy="173" rx="13" ry="6.5" fill={FUR_DARK} />
        <ellipse cx="136" cy="173" rx="13" ry="6.5" fill={FUR_DARK} />

        <g className="pet-body" style={origin(100, 176)}>
          <path d="M100 98c-30 0-46 34-46 60 0 14 18 18 46 18s46-4 46-18c0-26-16-60-46-60z" fill={FUR} />
          {/* Haunches, bulging out at the sides where the tiger sits. */}
          <path d="M56 150c0-14 9-24 20-24 8 8 8 30 2 46-15 0-22-8-22-22z" fill={FUR_DARK} opacity="0.35" />
          <path d="M144 150c0-14-9-24-20-24-8 8-8 30-2 46 15 0 22-8 22-22z" fill={FUR_DARK} opacity="0.35" />
          <g fill={STRIPE}>
            {BODY_STRIPES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          {/* The big white tummy. */}
          <path d="M100 104c-17 0-24 18-22 38 2 18 10 28 22 28s20-10 22-28c2-20-5-38-22-38z" fill={CREAM} />
          <path d="M91 124q9 4 18 0M92 135q8 3 16 0" stroke="#dbe4f5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <ellipse cx="84" cy="112" rx="14" ry="5" fill="#fff" opacity="0.2" />
          <MudSplats spots={MUD_SPOTS} count={mud} />
        </g>

        {/* Chunky front legs, striped, with white paws and toe lines. */}
        <FrontLeg x={84} />
        <FrontLeg x={116} />

        {mood === "hungry" && <Rumble x={91} y={146} color={STRIPE} />}

        {/* The hunter's sword, slung across the chest from its strap. */}
        {back === "hunterSword" && <Wear slot="back" worn={worn} at={ANCHORS.sword} />}
        <Wear slot="neck" worn={worn} at={ANCHORS.neck} />

        <g className="pet-head" style={origin(100, 108)}>
          {/* Small round ears with pale insides and a navy rim. */}
          <g className="pet-ear" style={origin(68, 48)}>
            <circle cx="62" cy="38" r="15" fill={FUR} />
            <path d="M48 34a15 15 0 0 1 20-10" stroke={STRIPE} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="62" cy="39" r="8.5" fill={EAR_IN} />
          </g>
          <g className="pet-ear-alt" style={origin(132, 48)}>
            <circle cx="138" cy="38" r="15" fill={FUR} />
            <path d="M152 34a15 15 0 0 0-20-10" stroke={STRIPE} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="138" cy="39" r="8.5" fill={EAR_IN} />
          </g>

          {/* A big, wide, round head, with fluffy tufts at the cheeks. */}
          <path
            d="M100 30c30 0 50 18 50 40 0 6 2 10 6 14-5 1-7 3-8 6 4 2 5 4 4 6-6 0-9 1-11 3-9 10-24 14-41 14s-32-4-41-14c-2-2-5-3-11-3-1-2 0-4 4-6-1-3-3-5-8-6 4-4 6-8 6-14 0-22 20-40 50-40z"
            fill={FUR}
          />
          <path d="M56 98c11 10 27 14 44 14s33-4 44-14" stroke={FUR_DARK} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
          <ellipse cx="86" cy="42" rx="18" ry="6" fill="#fff" opacity="0.16" />

          <g fill={STRIPE}>
            {HEAD_STRIPES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>

          {/* White brow spots over the eyes. */}
          <ellipse cx={EYE_L - 3} cy={EYE_Y - 13} rx="5" ry="2.6" fill={CREAM} opacity="0.9" />
          <ellipse cx={EYE_R + 3} cy={EYE_Y - 13} rx="5" ry="2.6" fill={CREAM} opacity="0.9" />

          {/* A big white muzzle and chin. */}
          <ellipse cx="89" cy="86" rx="14" ry="11" fill={CREAM} />
          <ellipse cx="111" cy="86" rx="14" ry="11" fill={CREAM} />
          <ellipse cx="100" cy="98" rx="14" ry="9" fill={CREAM} />
          <g fill={WHISKER} opacity="0.6">
            <circle cx="84" cy="84" r="1" />
            <circle cx="80" cy="88" r="1" />
            <circle cx="116" cy="84" r="1" />
            <circle cx="120" cy="88" r="1" />
          </g>

          <ellipse cx="66" cy="84" rx="7" ry="4" fill={mood === "sick" ? SICK_BLUSH : BLUSH} opacity={mood === "gone" ? 0 : 0.55} />
          <ellipse cx="134" cy="84" rx="7" ry="4" fill={mood === "sick" ? SICK_BLUSH : BLUSH} opacity={mood === "gone" ? 0 : 0.55} />

          <FrontEye x={EYE_L} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          <FrontEye x={EYE_R} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          {droopy && (
            <>
              <Lid x={EYE_L} y={EYE_Y} fur={FUR} size={EYE_SIZE} />
              <Lid x={EYE_R} y={EYE_Y} fur={FUR} size={EYE_SIZE} />
            </>
          )}

          {/* A wide pink nose. */}
          <g className="pet-nose" style={origin(100, 80)}>
            <path d="M93.5 76h13c1.2 0 1.6 1.2.9 2L101 83.5c-.6.6-1.4.6-2 0l-6.4-5.5c-.7-.8-.3-2 .9-2z" fill={NOSE} />
            <ellipse cx="97.6" cy="77.4" rx="2.2" ry="0.9" fill="#fff" opacity="0.6" />
          </g>
          <TigerMouth mood={mood} />

          {/* Whiskers, two a side. */}
          <g stroke={CREAM} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.9">
            <path d="M76 86q-12-3-24-1M76 91q-12 1-23 5" />
            <path d="M124 86q12-3 24-1M124 91q12 1 23 5" />
          </g>

          {mood === "sad" && <Tear x={EYE_L - 4} y={EYE_Y + 9} />}
          {mood === "vacation" && !worn.face && (
            <g transform={`translate(100 ${EYE_Y}) scale(1.55)`}>
              <Shades x={0} y={0} width={38} />
            </g>
          )}

          <Wear slot="face" worn={worn} at={ANCHORS.face} />
          <Wear slot="hat" worn={worn} at={worn.hat === "micHeadset" ? ANCHORS.headset : ANCHORS.hat} />
        </g>

        {mood === "asleep" && <Zzz x={142} y={30} />}
        {mood === "gone" && <Halo x={100} y={14} />}
        {mood === "happy" && <Sparkles points={SPARKLES} />}
      </g>
    </>
  );
}

function FrontLeg({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 10} y="132" width="20" height="42" rx="10" fill={FUR} />
      <path d={`M${x - 10} 144q6 1 10 4M${x + 10} 152q-6 1-10 4`} stroke={STRIPE} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx={x} cy="171" rx="12.5" ry="7" fill={CREAM} />
      <path d={`M${x - 4} 167v5M${x + 4} 167v5`} stroke="#c9d5ee" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

/** The goofy grin, with a row of top teeth, open wider still when happy. */
function Grin({ w, h }: { w: number; h: number }) {
  const top = 87;
  return (
    <g>
      <path d="M100 83.5v3" stroke={MOUTH} strokeWidth="1.8" strokeLinecap="round" />
      <path d={`M${100 - w} ${top}q${w} 6 ${w * 2} 0q-3 ${h} ${-w} ${h}q${-w + 3} 0 ${-w} ${-h}z`} fill={MOUTH_IN} />
      <path d={`M${100 - w + 1} ${top + 0.6}q${w - 1} 5.6 ${(w - 1) * 2} 0l-.8 2.6q${-w + 1.8} 5 ${-(w - 1.8) * 2} 0z`} fill="#fff" />
      <ellipse cx="100" cy={top + h - 3.2} rx={w * 0.42} ry={h * 0.22} fill={TONGUE} />
      <path d={`M${100 - w} ${top}q${w} 6 ${w * 2} 0`} stroke={MOUTH} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d={`M${100 - w - 2} ${top - 2}q1 2 2.4 2.2M${100 + w + 2} ${top - 2}q-1 2-2.4 2.2`} stroke={MOUTH} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function TigerMouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "happy":
      return <Grin w={19} h={19} />;
    case "hungry":
      return (
        <g>
          <path d="M100 83.5v3" stroke={MOUTH} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="100" cy="93" rx="5" ry="5.6" fill={MOUTH_IN} />
          <ellipse cx="100" cy="95.6" rx="3" ry="1.8" fill={TONGUE} />
        </g>
      );
    case "sad":
      return <path d="M100 83.5v4M91 95q9-7 18 0" stroke={MOUTH} strokeWidth="1.9" fill="none" strokeLinecap="round" />;
    case "sick":
      return (
        <g>
          <path d="M100 83.5v4M91 94q4.5-5 9-2t9-2" stroke={MOUTH} strokeWidth="1.9" fill="none" strokeLinecap="round" />
          <Thermometer x={106} y={92} />
        </g>
      );
    case "gone":
      return <path d="M100 83.5v4M93 91h14" stroke={MOUTH} strokeWidth="1.9" fill="none" strokeLinecap="round" />;
    case "asleep":
      // A closed, contented smile: even a goofy tiger shuts its mouth to snooze.
      return <path d="M100 83.5v3.5M89 88q11 8 22 0" stroke={MOUTH} strokeWidth="1.9" fill="none" strokeLinecap="round" />;
    default:
      return <Grin w={15} h={12.5} />;
  }
}
