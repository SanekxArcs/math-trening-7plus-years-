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
 * The bunny, sitting and facing us: a big round head, long ears (the right one
 * flopping over at the tip), big hind feet with their pads showing, and a
 * cotton tail peeking out at the side.
 */

const FUR = "#e8dfd5";
const FUR_DARK = "#cec1b3";
const FUR_SHADE = "#b9ab9d";
const TUMMY = "#fbf8f4";
const PINK = "#f6b3c2";
const PINK_DARK = "#ec8fa6";
const NOSE = "#f08aa2";
const MOUTH = "#7a4550";

const EYE_L = 87;
const EYE_R = 113;
const EYE_Y = 82;
const EYE_SIZE = 1.3;

const ANCHORS: Record<"hat" | "face" | "neck" | "wings" | "cape", Anchor> = {
  hat: { x: 100, y: 48, scale: 1.05 },
  face: { x: 100, y: EYE_Y, scale: 1.2 },
  neck: { x: 100, y: 118, scale: 1.05 },
  wings: { x: 100, y: 128, scale: 1.5 },
  cape: { x: 82, y: 112, rotate: 6, scale: 1.45 },
};

const MUD_SPOTS = [
  "M66 140c4-5 11-3 11 3s-6 7-10 5-5-4-1-8z",
  "M122 150c3-4 10-3 10 2s-5 7-9 6-4-4-1-8z",
  "M104 126c3-3 8-2 8 2s-4 5-7 4-3-3-1-6z",
  "M84 164c3-3 8-2 8 2s-4 5-7 4-3-3-1-6z",
];

const SPARKLES = [
  [34, 62, 0],
  [170, 44, 0.6],
  [30, 138, 1.2],
  [172, 128, 0.9],
] as const;

export function Bunny({ mood, mud, worn }: SpeciesArtProps) {
  const droopy = mood === "sad" || mood === "sick";
  const back = worn.back;

  return (
    <>
      <ellipse className="pet-shadow" style={origin(100, 182)} cx="100" cy="182" rx="54" ry="7" fill="#000" opacity="0.14" />

      <g className="pet-bob" style={origin(100, 176)}>
        {/* Wings and cape hang behind everything, poking out at both sides. */}
        {back === "wings" && <Wear slot="back" worn={worn} at={ANCHORS.wings} />}
        {back === "cape" && (
          <>
            <Wear slot="back" worn={worn} at={ANCHORS.cape} />
            <Wear slot="back" worn={worn} at={{ ...ANCHORS.cape, x: 200 - ANCHORS.cape.x, rotate: -(ANCHORS.cape.rotate ?? 0), flip: true }} />
          </>
        )}

        {/* The cotton tail, peeking out from behind on the right. */}
        <g className="pet-tail" style={origin(134, 158)}>
          <circle cx="146" cy="156" r="11" fill={TUMMY} />
          <circle cx="140" cy="148" r="7" fill={TUMMY} />
          <circle cx="153" cy="149" r="6" fill={TUMMY} />
          <circle cx="152" cy="163" r="6" fill={TUMMY} />
          <path d="M142 164c5 3 11 2 14-3" stroke={FUR_DARK} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
        </g>

        <g className="pet-body" style={origin(100, 170)}>
          <path d="M100 106c-30 0-44 26-42 50 2 16 18 22 42 22s40-6 42-22c2-24-12-50-42-50z" fill={FUR} />
          {/* Haunches either side, a shade darker where they tuck under. */}
          <path d="M60 150c2-12 12-18 22-16" stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M140 150c-2-12-12-18-22-16" stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="100" cy="148" rx="23" ry="26" fill={TUMMY} />
          <path d="M92 128q8 4 16 0" stroke={FUR_DARK} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
          <ellipse cx="84" cy="120" rx="12" ry="5" fill="#fff" opacity="0.3" />
          <MudSplats spots={MUD_SPOTS} count={mud} />

          {/* Front paws, tucked in against the tummy. */}
          <Paw x={88} />
          <Paw x={112} />
        </g>

        <Foot x={72} tilt={-10} />
        <Foot x={128} tilt={10} />

        {/* The hunter's sword, slung across the chest from its strap. */}
        {back === "hunterSword" && <Wear slot="back" worn={worn} at={{ x: 100, y: 142, scale: 0.85 }} />}
        <Wear slot="neck" worn={worn} at={ANCHORS.neck} />

        <g className="pet-head" style={origin(100, 112)}>
          {/* The left ear stands tall; the right one flops over at the tip. Sad, they fold out and down. */}
          <g transform={`rotate(${droopy ? -58 : -9} 88 52)`}>
            <g className="pet-ear" style={origin(88, 52)}>
              <path d="M79 54c-6-18-5-40 5-46 10-3 14 18 13 44z" fill={FUR} />
              <path d="M84 50c-4-14-3-30 2-36 5 2 7 18 6 36z" fill={PINK} />
              <path d="M86 20c1 8 1 18 1 26" stroke={PINK_DARK} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
            </g>
          </g>
          <g transform={`rotate(${droopy ? 58 : 9} 112 52)`}>
            <g className="pet-ear-alt" style={origin(112, 52)}>
              <path d="M103 53c-2-14 0-28 6-34 6-6 18-6 26 2 5 5 6 12 3 16-4-6-10-8-16-4-2 6-1 14 0 22z" fill={FUR} />
              <path d="M109 49c-1-10 0-20 4-25 5-4 13-3 18 2 2 3 2 6 1 8-4-4-9-5-13-2-3 5-3 11-2 17z" fill={PINK} />
              {/* The underside of the flopped tip, in fur shade. */}
              <path d="M122 32c5-4 11-3 16 3 1 3 0 5-1 6-4-6-10-8-15-6z" fill={FUR_DARK} />
            </g>
          </g>

          <ellipse cx="100" cy="78" rx="40" ry="36" fill={FUR} />
          {/* Fluffy cheeks bulging at the bottom, a forehead catching the light. */}
          <path d="M62 86c-4 10 0 20 8 24 4 2 7 0 8-2" fill={FUR} />
          <path d="M138 86c4 10 0 20-8 24-4 2-7 0-8-2" fill={FUR} />
          <path d="M64 96c2 6 6 10 11 12M136 96c-2 6-6 10-11 12" stroke={FUR_DARK} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
          <ellipse cx="88" cy="56" rx="16" ry="7" fill="#fff" opacity="0.35" />
          <path d="M96 46q4-4 8 0M94 50q6-3 12 0" stroke={FUR_DARK} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.6" />

          {/* The muzzle: two round whisker pads. */}
          <ellipse cx="93" cy="97" rx="9.5" ry="7.5" fill={TUMMY} />
          <ellipse cx="107" cy="97" rx="9.5" ry="7.5" fill={TUMMY} />
          <g fill={FUR_SHADE}>
            <circle cx="89" cy="96" r="1" />
            <circle cx="86" cy="99.5" r="1" />
            <circle cx="91" cy="100.5" r="1" />
            <circle cx="111" cy="96" r="1" />
            <circle cx="114" cy="99.5" r="1" />
            <circle cx="109" cy="100.5" r="1" />
          </g>
          <path d="M83 96l-14-3M83 100l-13 2M117 96l14-3M117 100l13 2" stroke={FUR_SHADE} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.7" />

          <FrontEye x={EYE_L} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          <FrontEye x={EYE_R} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          {droopy && (
            <>
              <Lid x={EYE_L} y={EYE_Y} fur={FUR} size={EYE_SIZE} />
              <Lid x={EYE_R} y={EYE_Y} fur={FUR} size={EYE_SIZE} />
            </>
          )}
          {mood === "vacation" && !worn.face && (
            <g transform={`translate(100 ${EYE_Y}) scale(1.35)`}>
              <Shades x={0} y={0} width={38} />
            </g>
          )}

          <g fill={mood === "sick" ? SICK_BLUSH : BLUSH} opacity={mood === "gone" ? 0 : 0.5}>
            <ellipse cx="72" cy="93" rx="7" ry="4.2" />
            <ellipse cx="128" cy="93" rx="7" ry="4.2" />
          </g>

          <BunnyMouth mood={mood} />
          <g className="pet-nose" style={origin(100, 92)}>
            <path d="M95 89.5c2-2 8-2 10 0 1 1.4-2.6 4.6-5 5.2-2.4-.6-6-3.8-5-5.2z" fill={NOSE} />
            <ellipse cx="98.6" cy="90" rx="1.6" ry="0.9" fill="#fff" opacity="0.7" />
          </g>

          <Wear slot="face" worn={worn} at={ANCHORS.face} />
          <Wear slot="hat" worn={worn} at={ANCHORS.hat} />
        </g>

        {mood === "asleep" && <Zzz x={140} y={56} />}
        {mood === "gone" && <Halo x={100} y={5} />}
        {mood === "sad" && <Tear x={EYE_L + 3} y={EYE_Y + 8} />}
        {mood === "hungry" && <Rumble x={91} y={140} color={MOUTH} />}
        {mood === "happy" && <Sparkles points={SPARKLES} />}
      </g>
    </>
  );
}

/** A front paw, with two little toe lines. */
function Paw({ x }: { x: number }) {
  return (
    <g>
      <ellipse cx={x} cy="160" rx="8.5" ry="10" fill={FUR} />
      <path d={`M${x - 2.5} ${166}v3M${x + 2.5} ${166}v3`} stroke={FUR_DARK} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

/** A big hind foot, sole to the front, with a pad and three toe beans. */
function Foot({ x, tilt }: { x: number; tilt: number }) {
  return (
    <g transform={`rotate(${tilt} ${x} 167)`}>
      <ellipse cx={x} cy="167" rx="16" ry="10.5" fill={FUR} />
      <ellipse cx={x} cy="170" rx="13" ry="6.5" fill={TUMMY} opacity="0.7" />
      <ellipse cx={x} cy="170.5" rx="6.5" ry="4.4" fill={PINK} />
      <circle cx={x - 7} cy="164.2" r="2.3" fill={PINK} />
      <circle cx={x} cy="162.4" r="2.4" fill={PINK} />
      <circle cx={x + 7} cy="164.2" r="2.3" fill={PINK} />
    </g>
  );
}

function BunnyMouth({ mood }: { mood: Mood }) {
  const teeth = (
    <g>
      <rect x="97" y="97.4" width="2.9" height="4.2" rx="0.8" fill="#fff" stroke="#e5d9cf" strokeWidth="0.6" />
      <rect x="100.1" y="97.4" width="2.9" height="4.2" rx="0.8" fill="#fff" stroke="#e5d9cf" strokeWidth="0.6" />
    </g>
  );
  const stroke = { stroke: MOUTH, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const };
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M100 94v2" {...stroke} />
          <path d="M91 97.5q9 13 18 0z" fill="#7a2e3a" />
          <ellipse cx="100" cy="104" rx="4.4" ry="2.4" fill="#f28b9b" />
          {teeth}
        </g>
      );
    case "hungry":
      return (
        <g>
          <path d="M100 94v2.4" {...stroke} />
          <ellipse cx="100" cy="102" rx="4.2" ry="5" fill="#7a2e3a" />
          {teeth}
        </g>
      );
    case "sad":
      return (
        <g>
          <path d="M100 94v3" {...stroke} />
          <path d="M93 103q7-6 14 0" {...stroke} />
        </g>
      );
    case "sick":
      return (
        <g>
          <path d="M100 94v3" {...stroke} />
          <path d="M93 102.5q3.5-3 7-.5t7-.5" {...stroke} />
          <Thermometer x={104} y={101.6} />
        </g>
      );
    case "gone":
      return (
        <g>
          <path d="M100 94v3" {...stroke} />
          <path d="M95 100h10" {...stroke} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M100 94v2.6M92.5 96.8q3.8 3.6 7.5 0q3.7 3.6 7.5 0" {...stroke} />
          {teeth}
        </g>
      );
  }
}
