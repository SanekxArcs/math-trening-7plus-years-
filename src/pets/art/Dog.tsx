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
  placed,
  type Anchor,
  type SpeciesArtProps,
} from "./parts";

/**
 * The puppy, sitting and facing us: a golden coat, floppy brown ears, a brown
 * patch over one eye, and a cream muzzle, bib and paws.
 */

const COAT = "#e9b872";
const COAT_DARK = "#cf9552";
/** The ears, the eye patch and the tail tip. */
const PATCH = "#9a6233";
const PATCH_DARK = "#7a4a24";
const CREAM = "#fcefd9";
const NOSE = "#2a1a14";
const MOUTH = "#6b3a22";
const INSIDE = "#7a2e2e";
const TONGUE = "#f28b9b";

/** Eyes, either side of the middle of the face. */
const EYE_X = 15;
const EYE_Y = 64;
const EYE_SIZE = 1.25;

const ANCHORS: Record<"hat" | "face" | "neck" | "wings" | "cape", Anchor> = {
  hat: { x: 100, y: 38, scale: 0.88 },
  face: { x: 100, y: EYE_Y, scale: EYE_X / 11 },
  neck: { x: 100, y: 106, scale: 1.1 },
  wings: { x: 100, y: 115, scale: 1.8 },
  cape: { x: 94, y: 104, rotate: 11, scale: 1.65 },
};

const MUD_SPOTS = [
  "M60 146c4-5 12-3 12 3s-7 8-11 6-5-5-1-9z",
  "M132 152c3-4 10-3 11 2s-5 7-9 6-5-4-2-8z",
  "M84 112c3-3 9-2 9 2s-4 6-7 5-4-4-2-7z",
  "M122 120c3-3 8-2 8 2s-4 5-7 4-3-3-1-6z",
];

const SPARKLES = [
  [30, 48, 0],
  [172, 36, 0.6],
  [34, 136, 1.2],
] as const;

export function Dog({ mood, mud, worn }: SpeciesArtProps) {
  const droopy = mood === "sad" || mood === "sick";
  const back = worn.back;

  return (
    <>
      <ellipse className="pet-shadow" style={origin(100, 182)} cx="100" cy="182" rx="56" ry="7" fill="#000" opacity="0.14" />

      <g className="pet-bob" style={origin(100, 176)}>
        {/* Back items hang behind the whole puppy: wings out of the shoulders, a cape either side. */}
        {back === "wings" && <Wear slot="back" worn={worn} at={ANCHORS.wings} />}
        {back === "cape" && (
          <>
            <Wear slot="back" worn={worn} at={ANCHORS.cape} />
            <Wear slot="back" worn={worn} at={{ ...ANCHORS.cape, x: 200 - ANCHORS.cape.x, rotate: -(ANCHORS.cape.rotate ?? 0), flip: true }} />
          </>
        )}

        <g className="pet-tail" style={origin(128, 164)}>
          <path d="M124 166c14-2 26-12 30-26 2-7 9-9 11-3 3 8-4 22-14 30-8 6-18 8-26 7z" fill={COAT} />
          <path d="M154 140c2-7 9-9 11-3 1 4 0 9-2 13-3-5-6-8-9-10z" fill={CREAM} />
          <path d="M136 164c8-4 14-10 18-18" stroke={COAT_DARK} strokeWidth="2.4" fill="none" opacity="0.45" strokeLinecap="round" />
        </g>

        <g className="pet-body" style={origin(100, 176)}>
          <path d="M78 102C66 114 58 136 60 158c1 14 12 19 40 19s39-5 40-19c2-22-6-44-18-56z" fill={COAT} />
          {/* The haunches, bulging at the sides where the puppy sits on them. */}
          <ellipse cx="68" cy="154" rx="17" ry="21" fill={COAT} />
          <ellipse cx="132" cy="154" rx="17" ry="21" fill={COAT} />
          <path d="M58 142c-2 12 3 24 14 30" stroke={COAT_DARK} strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />
          <path d="M142 142c2 12-3 24-14 30" stroke={COAT_DARK} strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />
          <ellipse cx="80" cy="116" rx="9" ry="5" fill="#fff" opacity="0.16" />
          {/* The cream bib down the chest. */}
          <path d="M84 104q16 8 32 0c3 18 0 38-16 50-16-12-19-32-16-50z" fill={CREAM} />
          <path d="M92 118q4 3 8 0M98 128q4 3 8 0M90 138q4 3 8 0" stroke={COAT_DARK} strokeWidth="1.4" fill="none" opacity="0.35" strokeLinecap="round" />
          <MudSplats spots={MUD_SPOTS} count={mud} />
        </g>

        {/* The hind paws poke out in front of the haunches, a shade darker. */}
        <Paw x={62} y={172} fill={COAT_DARK} toes={PATCH_DARK} />
        <Paw x={138} y={172} fill={COAT_DARK} toes={PATCH_DARK} />

        {/* The front legs, straight down, with cream socks. */}
        <rect x="80" y="130" width="17" height="44" rx="8.5" fill={COAT} />
        <rect x="103" y="130" width="17" height="44" rx="8.5" fill={COAT} />
        <path d="M95 136v30M105 136v30" stroke={COAT_DARK} strokeWidth="2" opacity="0.4" strokeLinecap="round" />
        <Paw x={88.5} y={172} fill={CREAM} toes={COAT_DARK} />
        <Paw x={111.5} y={172} fill={CREAM} toes={COAT_DARK} />

        {/* The hunter's sword, slung across the chest from its strap. */}
        {back === "hunterSword" && <Wear slot="back" worn={worn} at={{ x: 100, y: 142, scale: 0.85 }} />}
        <Wear slot="neck" worn={worn} at={ANCHORS.neck} />

        <g className="pet-head" style={origin(100, 102)}>
          {/* A big round head with chubby cheeks. */}
          <ellipse cx="100" cy="66" rx="42" ry="36" fill={COAT} />
          <ellipse cx="76" cy="84" rx="18" ry="14" fill={COAT} />
          <ellipse cx="124" cy="84" rx="18" ry="14" fill={COAT} />
          <path d="M62 86c8 12 22 17 38 17s30-5 38-17" stroke={COAT_DARK} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
          <ellipse cx="90" cy="41" rx="17" ry="6" fill="#fff" opacity="0.18" />
          <path d="M96 31c1-6 7-8 10-4-3 0-5 2-5 5z" fill={COAT_DARK} />

          {/* The patch over one eye, and the pale blaze running up between them. */}
          <path d="M103 58c1-11 15-16 25-10 8 5 8 19-1 24-9 5-21 3-23-5-1-3-2-6-1-9z" fill={PATCH} />
          <path d="M95 48q5-4 10 0l3 26h-16z" fill={CREAM} opacity="0.85" />

          <FrontEye x={100 - EYE_X} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          <FrontEye x={100 + EYE_X} y={EYE_Y} mood={mood} size={EYE_SIZE} />
          {droopy && (
            <>
              <Lid x={100 - EYE_X} y={EYE_Y} fur={COAT} size={EYE_SIZE} />
              <Lid x={100 + EYE_X} y={EYE_Y} fur={PATCH} size={EYE_SIZE} />
            </>
          )}
          <Brows mood={mood} />

          {/* The muzzle, with its whisker freckles. */}
          <path d="M100 72c14 0 24 6 24 15s-10 14-24 14-24-5-24-14 10-15 24-15z" fill={CREAM} />
          <g fill={COAT_DARK} opacity="0.6">
            <circle cx="86" cy="86" r="1.1" />
            <circle cx="82" cy="90" r="1.1" />
            <circle cx="88" cy="91" r="1.1" />
            <circle cx="114" cy="86" r="1.1" />
            <circle cx="118" cy="90" r="1.1" />
            <circle cx="112" cy="91" r="1.1" />
          </g>

          <ellipse cx="75" cy="80" rx="6" ry="3.5" fill={mood === "sick" ? SICK_BLUSH : BLUSH} opacity={mood === "gone" ? 0 : 0.5} />
          <ellipse cx="125" cy="80" rx="6" ry="3.5" fill={mood === "sick" ? SICK_BLUSH : BLUSH} opacity={mood === "gone" ? 0 : 0.5} />

          <DogMouth mood={mood} />

          <g className="pet-nose" style={origin(100, 80)}>
            <path d="M91 77c0-5 18-5 18 0 0 5-6 9-9 9s-9-4-9-9z" fill={NOSE} />
            <ellipse cx="96" cy="76" rx="2.8" ry="1.4" fill="#fff" opacity="0.75" />
            <circle cx="104" cy="75.6" r="0.9" fill="#fff" opacity="0.5" />
          </g>

          {/* Floppy ears, hanging from the top of the head over its sides. */}
          <g className="pet-ear" style={origin(70, 38)}>
            <path d="M76 36C62 30 48 38 45 54c-3 16-1 32 7 39 8 6 17 0 18-10 1-14 6-30 6-47z" fill={PATCH} />
            <path d="M66 44c-8 6-12 18-12 32" stroke={PATCH_DARK} strokeWidth="2.4" fill="none" opacity="0.6" strokeLinecap="round" />
          </g>
          <g className="pet-ear-alt" style={origin(130, 38)}>
            <path d="M124 36c14-6 28 2 31 18 3 16 1 32-7 39-8 6-17 0-18-10-1-14-6-30-6-47z" fill={PATCH} />
            <path d="M134 44c8 6 12 18 12 32" stroke={PATCH_DARK} strokeWidth="2.4" fill="none" opacity="0.6" strokeLinecap="round" />
          </g>

          {mood === "vacation" && !worn.face && (
            <g transform={placed({ x: 100, y: EYE_Y, scale: 1.4 })}>
              <Shades x={0} y={0} width={42} />
            </g>
          )}
          <Wear slot="face" worn={worn} at={ANCHORS.face} />
          <Wear slot="hat" worn={worn} at={ANCHORS.hat} />
        </g>

        {mood === "asleep" && <Zzz x={140} y={34} />}
        {mood === "gone" && <Halo x={100} y={20} />}
        {mood === "sad" && <Tear x={84} y={72} />}
        {mood === "hungry" && <Rumble x={91} y={118} color={MOUTH} />}
        {mood === "happy" && <Sparkles points={SPARKLES} />}
      </g>
    </>
  );
}

/** A round paw with two toe lines. */
function Paw({ x, y, fill, toes }: { x: number; y: number; fill: string; toes: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="11" ry="6.5" fill={fill} />
      <path d={`M${x - 3.5} ${y - 1}v4M${x + 3.5} ${y - 1}v4`} stroke={toes} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

/** Little brow tufts that tilt with the mood. */
function Brows({ mood }: { mood: Mood }) {
  if (mood === "gone" || mood === "vacation") return null;
  const worried = mood === "sad" || mood === "sick" || mood === "hungry";
  const lx = 100 - EYE_X;
  const rx = 100 + EYE_X;
  const y = EYE_Y - 13;
  return (
    <g stroke={PATCH_DARK} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.75">
      {worried ? (
        <path d={`M${lx - 5} ${y}l9-3M${rx + 5} ${y}l-9-3`} />
      ) : (
        <path d={`M${lx - 4} ${y - 1}q4-3 8 0M${rx - 4} ${y - 1}q4-3 8 0`} />
      )}
    </g>
  );
}

function DogMouth({ mood }: { mood: Mood }) {
  // The line from the nose down to the mouth is there in every mood.
  const philtrum = <path d="M100 85v4" stroke={MOUTH} strokeWidth="2" strokeLinecap="round" />;
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M87 88q13 4 26 0-2 15-13 15t-13-15z" fill={INSIDE} />
          <path d="M93 96h14v5a7 7 0 0 1-14 0z" fill={TONGUE} />
          <path d="M100 97v6" stroke="#e06b80" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M87 88q13 4 26 0" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "hungry":
      return (
        <g>
          {philtrum}
          <ellipse cx="100" cy="94" rx="4.6" ry="5.2" fill={INSIDE} />
          <path d="M107 93c0 0-2.6 4-1.3 6 1.3 1.6 3.3.7 3-1.3-.3-2-1.7-4.7-1.7-4.7z" fill="#bfe3ff" stroke="#93c5fd" strokeWidth="0.6" />
        </g>
      );
    case "sad":
      return (
        <g>
          {philtrum}
          <path d="M91 95q9-7 18 0" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "sick":
      return (
        <g>
          {philtrum}
          <path d="M91 94q4.5-3 9 0t9 0" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />
          <Thermometer x={106} y={93} />
        </g>
      );
    case "gone":
      return (
        <g>
          {philtrum}
          <path d="M93 92h14" stroke={MOUTH} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    default:
      // A little "w": the two sides of the muzzle curling up.
      return (
        <g>
          {philtrum}
          <path d="M100 89q-5 5-10 1M100 89q5 5 10 1" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}
