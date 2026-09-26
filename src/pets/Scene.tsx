import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import "./scene.css";

/**
 * Where a pet lives: the meadow everyone starts in, or one of the homes from
 * the wardrobe. Drawn as one wide SVG behind the pet, cropped from the bottom
 * so the ground always meets the pet's feet whatever the width of the screen.
 *
 * Bedtime and pet heaven keep their own skies over any home: that the pet is
 * asleep, or gone, matters more than where.
 */

const HOMES = ["meadow", "beach", "snow", "candy", "castle", "space", "seoul", "stage"] as const;
type Home = (typeof HOMES)[number];

function toHome(id: string | undefined): Home {
  return HOMES.find((home) => home === id) ?? "meadow";
}

export function Scene({
  home,
  night = false,
  gone = false,
  children,
}: {
  home?: string | undefined;
  night?: boolean;
  gone?: boolean;
  children: React.ReactNode;
}) {
  const place = toHome(home);
  const special = night || gone;
  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden px-6 pt-6",
        night
          ? "bg-linear-to-b from-indigo-400 via-indigo-300 to-violet-300 dark:from-indigo-950 dark:via-indigo-950 dark:to-violet-950"
          : gone
            ? "bg-linear-to-b from-indigo-200 to-violet-100 dark:from-indigo-950 dark:to-violet-950"
            : "bg-sky-200 dark:bg-sky-950",
      )}
    >
      {!special && (
        <svg
          className="scene pointer-events-none absolute inset-0 size-full dark:brightness-75"
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden
        >
          <Backdrop home={place} />
        </svg>
      )}
      {!special && place === "meadow" && (
        <motion.span
          className="pointer-events-none absolute top-8 h-6 w-20 rounded-full bg-white/80 shadow-[14px_-8px_0_-2px_rgb(255_255_255/0.8),-12px_-4px_0_-4px_rgb(255_255_255/0.8)]"
          initial={{ left: "-20%" }}
          animate={{ left: "110%" }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      )}
      {children}
      {special && (
        <span
          className={cn(
            "pointer-events-none absolute -bottom-10 left-1/2 h-24 w-[140%] -translate-x-1/2 rounded-[50%]",
            night ? "bg-indigo-900/40 dark:bg-indigo-900/60" : "bg-violet-200/70 dark:bg-violet-900/40",
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

/** A home on its own, for the wardrobe's tile. */
export function ScenePreview({ home, className }: { home: string; className?: string }) {
  return (
    <svg viewBox="40 60 320 240" preserveAspectRatio="xMidYMax slice" className={cn("scene scene--still", className)} aria-hidden>
      <Backdrop home={toHome(home)} />
    </svg>
  );
}

/** The ground line every home keeps, so the pet stands at the same height in all of them. */
const GROUND = "M-20 262Q200 226 420 262V320H-20z";

function Backdrop({ home }: { home: Home }) {
  switch (home) {
    case "beach":
      return (
        <g>
          <rect width="400" height="300" fill="#7dd3fc" />
          <rect y="150" width="400" height="150" fill="#bae6fd" />
          <circle cx="330" cy="58" r="26" fill="#fde047" />
          <circle cx="330" cy="58" r="36" fill="#fde047" opacity="0.25" />
          <path className="scene-wave" d="M-40 196q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0v20h-480z" fill="#38bdf8" />
          <path className="scene-wave scene-wave--slow" d="M-40 214q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0v24h-480z" fill="#0ea5e9" opacity="0.8" />
          <path d={GROUND} fill="#fde68a" />
          <path d="M-20 268Q200 236 420 268" stroke="#fef3c7" strokeWidth="5" fill="none" />
          {/* A palm tree, a starfish and a shell. */}
          <path d="M44 262c4-40 0-80-12-112" stroke="#a16207" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M32 150c-22-12-42-4-50 8 18-6 34-4 50-8zM32 150c-6-24 8-40 22-44-8 14-12 28-22 44zM32 150c22-10 42 0 48 14-16-8-32-8-48-14zM32 150c-24 4-36 22-36 36 10-16 22-26 36-36z" fill="#16a34a" />
          <circle cx="36" cy="156" r="5" fill="#78350f" />
          <path d="M346 270l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#fb923c" />
          <path d="M300 276q8-14 16 0z" fill="#fda4af" />
        </g>
      );
    case "snow":
      return (
        <g>
          <rect width="400" height="300" fill="#c7d2fe" />
          <path d="M-20 214l80-70 50 40 60-66 70 62 50-38 130 90v90H-20z" fill="#e0e7ff" />
          <path d="M60 144l-14 12 14-2 8 8 6-6zM170 118l-16 16 14-3 8 7 10-6z" fill="#fff" />
          <path d={GROUND} fill="#f8fafc" />
          {/* A snowman keeping the pet company, and a little fir tree. */}
          <circle cx="334" cy="244" r="20" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx="334" cy="212" r="14" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M334 212l12 3-12 2z" fill="#f97316" />
          <circle cx="329" cy="208" r="1.8" fill="#1f2937" />
          <circle cx="339" cy="208" r="1.8" fill="#1f2937" />
          <path d="M322 224q12 6 24 0" stroke="#ef4444" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M60 250l-22 0 22-30-16 0 16-24-12 0 12-20 12 20-12 0 16 24-16 0 22 30z" fill="#15803d" />
          <path d="M58 250h4v12h-4z" fill="#78350f" />
          {[
            [40, 30, 0],
            [120, 60, 1.4],
            [200, 20, 0.6],
            [260, 80, 2.2],
            [330, 40, 1],
            [90, 110, 2.8],
            [370, 120, 1.8],
          ].map(([x, y, delay]) => (
            <circle key={`${x}-${y}`} className="scene-snow" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="3.4" fill="#fff" />
          ))}
        </g>
      );
    case "candy":
      return (
        <g>
          <rect width="400" height="300" fill="#fbcfe8" />
          <circle cx="80" cy="60" r="30" fill="#fff" opacity="0.5" />
          <circle cx="110" cy="54" r="22" fill="#fff" opacity="0.5" />
          <path d="M-20 230q60-50 120 0t120 0 120 0 120 0v80h-480z" fill="#f9a8d4" />
          <path d={GROUND} fill="#c4b5fd" />
          <path d="M-20 262Q200 226 420 262" stroke="#fff" strokeWidth="4" strokeDasharray="10 12" fill="none" opacity="0.7" />
          {/* Lollipops and a gumdrop. */}
          {(
            [
              [44, 190, "#f472b6"],
              [352, 176, "#38bdf8"],
            ] as const
          ).map(([x, y, color]) => (
            <g key={x}>
              <path d={`M${x} ${y}v${254 - y}`} stroke="#fff" strokeWidth="5" strokeLinecap="round" />
              <circle cx={x} cy={y} r="22" fill={color} />
              <path d={`M${x} ${y}m-14 0a14 14 0 1 1 14 14a8 8 0 1 1-8-8`} stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
            </g>
          ))}
          <path d="M300 262q0-26 18-26t18 26z" fill="#4ade80" />
          <circle cx="312" cy="248" r="2" fill="#fff" />
          <path d="M96 262q0-18 13-18t13 18z" fill="#facc15" />
        </g>
      );
    case "castle":
      return (
        <g>
          <rect width="400" height="300" fill="#bfdbfe" />
          <path d="M-20 230q100-40 200-10t240-20v100h-440z" fill="#86efac" />
          {/* The castle on the hill behind, with its flags flying. */}
          <g fill="#e9d5ff" stroke="#c4b5fd" strokeWidth="2">
            <path d="M238 232v-86h84v86z" />
            <path d="M226 232v-120h28v120zM306 232v-120h28v120z" />
            <path d="M266 146v-40h28v40z" />
          </g>
          <path d="M226 112l14-30 14 30zM306 112l14-30 14 30zM266 106l14-30 14 30z" fill="#a855f7" />
          <path d="M240 82v-16l14 6-14 6M320 82v-16l14 6-14 6M280 76v-16l14 6-14 6" stroke="#7c3aed" strokeWidth="1.6" fill="#f472b6" />
          <path d="M268 232v-36q12-14 24 0v36z" fill="#7c3aed" />
          <rect x="234" y="140" width="8" height="12" rx="4" fill="#7c3aed" />
          <rect x="316" y="140" width="8" height="12" rx="4" fill="#7c3aed" />
          <path d={GROUND} fill="#4ade80" />
          {[40, 70, 110, 360].map((x, i) => (
            <g key={x} transform={`translate(${x} ${258 - (i % 2) * 6})`}>
              <circle r="4" fill={i % 2 ? "#f9a8d4" : "#fde047"} />
              <circle r="1.6" fill="#f59e0b" />
            </g>
          ))}
        </g>
      );
    case "space":
      return (
        <g>
          <rect width="400" height="300" fill="#1e1b4b" />
          <circle cx="330" cy="70" r="30" fill="#f472b6" />
          <ellipse cx="330" cy="70" rx="48" ry="9" fill="none" stroke="#fde68a" strokeWidth="4" transform="rotate(-16 330 70)" />
          <circle cx="320" cy="62" r="6" fill="#fbcfe8" opacity="0.6" />
          <circle cx="70" cy="90" r="12" fill="#38bdf8" />
          <circle cx="66" cy="86" r="3" fill="#bae6fd" />
          {[
            [30, 30, 0],
            [110, 50, 0.8],
            [170, 22, 1.6],
            [220, 70, 0.4],
            [260, 30, 1.2],
            [380, 140, 2],
            [150, 120, 2.4],
            [20, 150, 1],
            [240, 150, 0.2],
          ].map(([x, y, delay]) => (
            <circle key={`${x}-${y}`} className="scene-star" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="2" fill="#fff" />
          ))}
          <path d={GROUND} fill="#a5b4fc" />
          {/* Moon craters, and a tiny rocket parked beside the pet. */}
          <ellipse cx="80" cy="268" rx="18" ry="5" fill="#818cf8" />
          <ellipse cx="300" cy="276" rx="24" ry="6" fill="#818cf8" />
          <path d="M352 256v-44q0-18 12-28 12 10 12 28v44z" fill="#f8fafc" />
          <circle cx="364" cy="214" r="6" fill="#38bdf8" stroke="#64748b" strokeWidth="2" />
          <path d="M352 236l-10 20h10zM376 236l10 20h-10z" fill="#ef4444" />
        </g>
      );
    case "seoul":
      return (
        <g>
          <rect width="400" height="300" fill="#312e81" />
          <rect y="140" width="400" height="160" fill="#4338ca" opacity="0.6" />
          <circle cx="330" cy="56" r="26" fill="#fef3c7" />
          <circle cx="330" cy="56" r="40" fill="#fef3c7" opacity="0.18" />
          {[
            [30, 30, 0],
            [90, 60, 1],
            [160, 24, 0.5],
            [240, 44, 1.6],
            [270, 90, 2.2],
          ].map(([x, y, delay]) => (
            <circle key={`${x}-${y}`} className="scene-star" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="1.8" fill="#fff" />
          ))}
          {/* The hill and its tower off to one side, where the pet does not hide them. */}
          <g transform="translate(-100 -14)">
            <path d="M120 222q60-60 130 0z" fill="#1e1b4b" />
          <path d="M183 176v-70h4v70z" fill="#e0e7ff" />
          <path d="M178 118h14l-2 8h-10z" fill="#c7d2fe" />
          <circle cx="185" cy="104" r="2.6" fill="#f472b6" className="scene-star" />
          <path d="M175 176h20l-3-10h-14z" fill="#a5b4fc" />
          </g>
          <g fill="#1e1b4b">
            <rect x="-10" y="170" width="44" height="80" />
            <rect x="30" y="150" width="30" height="100" />
            <rect x="58" y="186" width="40" height="64" />
            <rect x="256" y="160" width="34" height="90" />
            <rect x="288" y="182" width="46" height="68" />
            <rect x="332" y="146" width="30" height="104" />
            <rect x="360" y="176" width="50" height="74" />
          </g>
          {[
            [6, 182], [18, 196], [38, 162], [48, 178], [38, 198], [66, 196], [82, 210], [264, 172], [276, 190],
            [298, 194], [316, 208], [340, 158], [350, 176], [340, 200], [372, 188], [390, 204],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="6" height="7" rx="1" fill="#fde68a" opacity="0.85" />
          ))}
          <path d="M-20 262Q200 226 420 262V320H-20z" fill="#475569" />
          {/* A hanok roof at the edge, its tiles curling up at the corners. */}
          <path d="M290 238q30-14 90-12 20 0 36-8-6 14-26 18h-100q-10 0-14-6z" fill="#1f2937" />
          <path d="M306 244h82v22h-82z" fill="#7c2d12" />
          <path d="M318 248h14v18h-14zM362 248h14v18h-14z" fill="#fde68a" opacity="0.8" />
          <path d="M-20 270Q200 236 420 270" stroke="#94a3b8" strokeWidth="2" strokeDasharray="14 10" fill="none" />
        </g>
      );
    case "stage":
      return (
        <g>
          <rect width="400" height="300" fill="#2e1065" />
          {/* Spotlights sweeping from the rig above. */}
          {(
            [
              [70, "#f0abfc", 0],
              [200, "#fde68a", 1.3],
              [330, "#67e8f9", 0.6],
            ] as const
          ).map(([x, color, delay]) => (
            <g key={x} className="scene-beam" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px 0px` }}>
              <path d={`M${x - 8} 0h16l60 262h-136z`} fill={color} opacity="0.22" />
            </g>
          ))}
          <path d="M0 14h400" stroke="#1e1b4b" strokeWidth="10" />
          {[40, 100, 160, 240, 300, 360].map((x) => (
            <circle key={x} cx={x} cy="16" r="5" fill="#fef3c7" />
          ))}
          {/* The golden arch the hunters sing to keep up, shimmering behind the stage. */}
          <path d="M60 250a140 140 0 0 1 280 0" stroke="#fbbf24" strokeWidth="10" fill="none" opacity="0.85" />
          <path d="M60 250a140 140 0 0 1 280 0" stroke="#fef3c7" strokeWidth="3" fill="none" className="scene-star" />
          <path d="M40 250a160 160 0 0 1 320 0" stroke="#fbbf24" strokeWidth="18" fill="none" opacity="0.18" />
          <path d="M-20 262Q200 230 420 262V320H-20z" fill="#1e1b4b" />
          <path d="M-20 262Q200 230 420 262" stroke="#e879f9" strokeWidth="3" fill="none" />
          {/* A crowd of lightsticks waving in the dark. */}
          {Array.from({ length: 13 }, (_, i) => {
            const x = 8 + i * 32;
            const y = 286 + (i % 2) * 6;
            return (
              <g key={x} className="scene-bob" style={{ animationDelay: `${(i % 4) * 0.3}s` }}>
                <path d={`M${x} ${y}v-14`} stroke="#94a3b8" strokeWidth="2.4" />
                <circle cx={x} cy={y - 17} r="5" fill={i % 3 === 0 ? "#f0abfc" : i % 3 === 1 ? "#67e8f9" : "#fde68a"} />
              </g>
            );
          })}
          <path d="M40 60l2 5 5 .5-4 3 1.4 5-4.4-2.8-4.4 2.8 1.4-5-4-3 5-.5z" fill="#fde68a" className="scene-star" />
          <path d="M360 90l2 5 5 .5-4 3 1.4 5-4.4-2.8-4.4 2.8 1.4-5-4-3 5-.5z" fill="#f0abfc" className="scene-star" style={{ animationDelay: "1s" }} />
        </g>
      );
    default:
      return (
        <g>
          <rect width="400" height="300" fill="#bae6fd" />
          <rect y="120" width="400" height="180" fill="#e0f2fe" />
          <circle cx="344" cy="46" r="24" fill="oklch(0.92 0.14 90)" />
          <circle cx="344" cy="46" r="36" fill="oklch(0.92 0.14 90)" opacity="0.3" />
          <path d={GROUND} fill="#bef264" />
        </g>
      );
  }
}
