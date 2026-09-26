/**
 * The wardrobe, drawn. Each accessory is drawn once, around (0, 0), at the
 * size of a medium head; a species' anchor moves, turns and scales it into
 * place (see parts.tsx).
 *
 * - Hats sit with their brim on y = 0 and rise into negative y.
 * - Neckwear is a band along y = 0, about 40 wide, with anything that hangs
 *   below it.
 * - Glasses face forward with the lenses at x = ±11, or, side-on, one lens at
 *   the origin with the arm running back along −x.
 * - Back items sit on the top of the back at the origin: a saddle across it,
 *   a cape hanging from it, wings rising out of it.
 */

const GOLD = "#fbbf24";
const GOLD_DARK = "#d97706";
const INK = "#1f2937";

export function AccessoryShape({ id, profile = false }: { id: string; profile?: boolean | undefined }) {
  switch (id) {
    case "bow":
      return (
        <g>
          <path d="M-2-6c-8-10-20-8-19 1s11 11 19 4z" fill="#f472b6" />
          <path d="M2-6c8-10 20-8 19 1s-11 11-19 4z" fill="#f472b6" />
          <path d="M-5-7c-5-4-11-3-12 1M5-7c5-4 11-3 12 1" stroke="#fbcfe8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M-3-4l-6 12 5-2 3 4zM3-4l6 12-5-2-3 4z" fill="#ec4899" />
          <ellipse cx="0" cy="-5" rx="5" ry="5.5" fill="#db2777" />
          <ellipse cx="-1.4" cy="-6.6" rx="1.6" ry="1.2" fill="#fbcfe8" />
        </g>
      );
    case "partyHat":
      return (
        <g>
          <path d="M-15 0L0-40 15 0z" fill="#a78bfa" />
          <path d="M-11.3-10L-7.5-20l12.4 7L7.5-20l3.8 10z" fill="#f472b6" opacity="0.85" />
          <path d="M-5.6-25L-3.4-30.5l6.8 4-1.2 4.6z" fill="#facc15" />
          <circle cx="-6" cy="-4" r="1.8" fill="#fef08a" />
          <circle cx="6" cy="-6" r="1.8" fill="#fef08a" />
          <path d="M-16 0q16 5 32 0" stroke="#7c3aed" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="-41" r="5.5" fill="#facc15" />
          <circle cx="-1.6" cy="-42.6" r="1.8" fill="#fef9c3" />
        </g>
      );
    case "flowerCrown":
      return (
        <g>
          <path d="M-24 2q24-12 48 0" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" />
          {[-14, -4, 6, 16].map((x, i) => (
            <path key={x} d={`M${x} ${-4 - (i % 2)}q3-6 8-3-3 5-8 3z`} fill="#4ade80" />
          ))}
          {(
            [
              [-20, -1, "#f9a8d4"],
              [-10, -6, "#fde047"],
              [0, -8, "#f472b6"],
              [10, -6, "#c4b5fd"],
              [20, -1, "#fda4af"],
            ] as const
          ).map(([x, y, color]) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((turn) => (
                <ellipse key={turn} cx="0" cy="-3.6" rx="2.8" ry="3.8" fill={color} transform={`rotate(${turn})`} />
              ))}
              <circle r="2.4" fill="#f59e0b" />
            </g>
          ))}
        </g>
      );
    case "cowboyHat":
      return (
        <g>
          <path d="M-32-2q0 8 32 7t32-7q-6-6-32-4t-32 4z" fill="#92400e" />
          <path d="M-15-4c-2-12 0-24 6-26 4 3 6 3 9 0 3 3 5 3 9 0 6 2 8 14 6 26q-15 4-30 0z" fill="#b45309" />
          <path d="M-15-8q15 4 30 0v-4q-15 4-30 0z" fill="#451a03" />
          <path d="M-3-26q3 6 6 0" stroke="#78350f" strokeWidth="1.8" fill="none" />
          <path d="M-28-1q28 7 56 0" stroke="#fbbf24" strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M5-11l1.4 3 3.2.3-2.4 2 .8 3.2-3-1.8-3 1.8.8-3.2-2.4-2 3.2-.3z" fill={GOLD} />
        </g>
      );
    case "wizardHat":
      return (
        <g>
          <path d="M-16-2C-10-18-6-34 2-44c6-7 16-6 18 2-6-3-11-1-12 6 1 12 4 22 8 34z" fill="#4338ca" />
          <path d="M-14-6q15 4 29 0l1 4q-15 5-31 0z" fill="#facc15" />
          <ellipse cx="0" cy="-1" rx="27" ry="6" fill="#3730a3" />
          <path d="M-2-24l1.3 3.6 3.8.1-3 2.3 1.1 3.7-3.2-2.2-3.2 2.2 1.1-3.7-3-2.3 3.8-.1z" fill="#fde047" />
          <circle cx="6" cy="-14" r="1.6" fill="#fde047" />
          <circle cx="-7" cy="-13" r="1.2" fill="#fde047" />
          <circle cx="8" cy="-32" r="1.4" fill="#fde047" />
          <circle cx="20" cy="-40" r="3" fill="#fde047" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M-19 0l-3-24 10 10 5-16 7 13 7-13 5 16 10-10-3 24z" fill={GOLD} />
          <path d="M-19 0h38l-1-6h-36z" fill={GOLD_DARK} />
          <path d="M-14-19l-1.6-7M0-15v-10" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          {(
            [
              [-22, -25],
              [-7, -31],
              [7, -31],
              [22, -25],
            ] as const
          ).map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="2.4" fill="#fef3c7" />
          ))}
          <circle cx="0" cy="-12" r="3.6" fill="#ef4444" />
          <circle cx="-11" cy="-9" r="2.6" fill="#3b82f6" />
          <circle cx="11" cy="-9" r="2.6" fill="#22c55e" />
          <circle cx="-1" cy="-13.2" r="1.1" fill="#fff" opacity="0.8" />
        </g>
      );

    case "bandana":
      return (
        <g>
          <path d="M-22-4q22 8 44 0l-4 6c-6 8-12 14-18 20-6-6-12-12-18-20z" fill="#ef4444" />
          <path d="M-22-4q22 8 44 0l-1 3q-21 8-42 0z" fill="#b91c1c" />
          {[
            [-10, 4],
            [2, 6],
            [10, 3],
            [-3, 12],
            [4, 14],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#fff" />
          ))}
        </g>
      );
    case "bell":
      return (
        <g>
          <path d="M-21-3q21 7 42 0v5q-21 7-42 0z" fill="#dc2626" />
          <path d="M-20-1q20 6 40 0" stroke="#fca5a5" strokeWidth="1" fill="none" />
          <path d="M-3 3h6v3h-6z" fill={GOLD_DARK} />
          <path d="M-7 14c0-6 3-9 7-9s7 3 7 9z" fill={GOLD} />
          <path d="M-8 14h16" stroke={GOLD_DARK} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="0" cy="15.5" r="2" fill={GOLD_DARK} />
          <path d="M-3 8q1-2 3-2" stroke="#fef3c7" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "bowTie":
      return (
        <g>
          <path d="M-3-2l-15-8q-3 10 0 20l15-8z" fill="#2563eb" />
          <path d="M3-2l15-8q3 10 0 20L3 2z" fill="#2563eb" />
          <path d="M-15-5q-1 5 0 10M15-5q1 5 0 10" stroke="#93c5fd" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="-10" cy="-2" r="1.4" fill="#fff" />
          <circle cx="-9" cy="4" r="1.4" fill="#fff" />
          <circle cx="10" cy="-2" r="1.4" fill="#fff" />
          <circle cx="9" cy="4" r="1.4" fill="#fff" />
          <rect x="-4.5" y="-5" width="9" height="10" rx="3" fill="#1d4ed8" />
        </g>
      );
    case "pearls":
      return (
        <g>
          {Array.from({ length: 11 }, (_, i) => {
            const x = -20 + i * 4;
            const y = 7 - (x * x) / 60;
            return (
              <g key={x}>
                <circle cx={x} cy={8.5 - y + 2} r="2.7" fill="#fdf4ff" stroke="#e9d5ff" strokeWidth="0.8" />
                <circle cx={x - 0.8} cy={8.5 - y + 1.2} r="0.9" fill="#fff" />
              </g>
            );
          })}
          <circle cx="0" cy="13" r="4" fill="#f5d0fe" stroke="#e879f9" strokeWidth="0.8" />
          <circle cx="-1.2" cy="11.8" r="1.2" fill="#fff" />
        </g>
      );
    case "medal":
      return (
        <g>
          <path d="M-14-4l8 20h6l-8-20z" fill="#2563eb" />
          <path d="M14-4l-8 20H0l8-20z" fill="#dc2626" />
          <circle cx="0" cy="22" r="10" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />
          <path d="M0 15.5l1.9 4.1 4.5.4-3.4 3 1 4.4L0 25.1l-4 2.3 1-4.4-3.4-3 4.5-.4z" fill="#fef3c7" />
          <path d="M-6 18a8 8 0 0 1 4-4" stroke="#fef3c7" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      );

    case "roundGlasses":
      return profile ? (
        <g fill="none" stroke={INK} strokeWidth="2">
          <circle r="8.5" fill="#e0f2fe" fillOpacity="0.35" />
          <path d="M-8.5-1l-16-2" strokeLinecap="round" />
          <path d="M-3-4q2-2 5-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ) : (
        <g fill="none" stroke={INK} strokeWidth="2">
          <circle cx="-11" r="8.5" fill="#e0f2fe" fillOpacity="0.35" />
          <circle cx="11" r="8.5" fill="#e0f2fe" fillOpacity="0.35" />
          <path d="M-3-1q3-3 6 0M-19.5-1l-5-2M19.5-1l5-2" strokeLinecap="round" />
          <path d="M-14-4q2-2 5-1M8-4q2-2 5-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case "sunglasses":
      return profile ? (
        <g>
          <path d="M-10-6h18q3 0 2 4-1 8-10 8-9 0-10-8z" fill={INK} />
          <path d="M-10-4l-15-1" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M-3-3l5 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
        </g>
      ) : (
        <g>
          <path d="M-22-6h19q2 0 1 4-1 8-10 8-9 0-10-8zM22-6H3q-2 0-1 4 1 8 10 8 9 0 10-8z" fill={INK} />
          <path d="M-3-4q3-2 6 0M-22-5l-4-1M22-5l4-1" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M-17-3l5 0M7-3l5 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case "heartGlasses":
      return profile ? (
        <g>
          <path d="M0 8C-6 3-10 0-10-4c0-4 5-6 10-2 5-4 10-2 10 2 0 4-4 7-10 12z" fill="#ef4444" stroke="#991b1b" strokeWidth="1.2" />
          <path d="M-9-2l-16-1" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" />
          <path d="M-6-4q1-2 3-1" stroke="#fecaca" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {[-11, 11].map((x) => (
            <path
              key={x}
              d={`M${x} 8c-6-5-10-8-10-12 0-4 5-6 10-2 5-4 10-2 10 2 0 4-4 7-10 12z`}
              fill="#ef4444"
              stroke="#991b1b"
              strokeWidth="1.2"
            />
          ))}
          <path d="M-2-3q2-2 4 0M-21-2l-4-2M21-2l4-2" stroke="#991b1b" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M-17-4q1-2 3-1M5-4q1-2 3-1" stroke="#fecaca" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );

    case "saddle":
      return (
        <g>
          <path d="M-3 0v26" stroke="#78350f" strokeWidth="4" />
          <path d="M-9 26h12v6h-12z" fill="#9ca3af" />
          <path d="M-30 4q-2-10 6-12 12 6 24 4 10-2 16-10 8 0 10 8 0 12-14 14h-28q-12 0-14-4z" fill="#b91c1c" />
          <path d="M-22-4q12 6 24 4 10-2 16-10 4 1 6 4-6 10-22 12-14 1-26-4z" fill="#92400e" />
          <path d="M-26 8q20 5 44-1" stroke="#fbbf24" strokeWidth="1.6" fill="none" strokeDasharray="3 3" />
          <path d="M16-10q2-5 6-4" stroke="#92400e" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "cape":
      return (
        <g>
          <path d="M-10-4q10-4 22 0 6 16-2 44-22 4-44-2 10-20 24-42z" fill="#dc2626" />
          <path d="M-10-4q10-4 22 0-2 6-2 6-10-3-18 0z" fill="#fbbf24" />
          <path d="M10 40q-22 4-44-2" stroke="#fbbf24" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M-4 6q-8 14-18 28" stroke="#991b1b" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
          <path d="M4 22l2.2 4.5 5 .6-3.6 3.4.9 4.9L4 33l-4.5 2.4.9-4.9-3.6-3.4 5-.6z" fill="#fde047" />
        </g>
      );
    case "wings":
      return (
        <g>
          <g opacity="0.92">
            <path d="M-2-2C-14-30-40-40-46-28-50-18-34-6-2-2z" fill="#c4b5fd" stroke="#a78bfa" strokeWidth="1.4" />
            <path d="M-2 0C-20 4-34 14-30 22-24 30-10 18-2 0z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1.4" />
            <path d="M2-2C14-34 36-42 42-32 46-22 30-8 2-2z" fill="#c4b5fd" stroke="#a78bfa" strokeWidth="1.4" />
            <path d="M2 0C18 4 30 14 26 22 20 30 8 18 2 0z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1.4" />
          </g>
          <path d="M-6-6q-16-14-32-18M6-6q14-16 28-20" stroke="#fff" strokeWidth="1.6" fill="none" opacity="0.8" strokeLinecap="round" />
          <circle cx="-34" cy="-26" r="1.8" fill="#fff" />
          <circle cx="30" cy="-28" r="1.8" fill="#fff" />
          <circle cx="-22" cy="16" r="1.4" fill="#fff" />
        </g>
      );
    // The K-pop demon hunters' collection.
    case "micHeadset":
      return (
        <g>
          <path d="M-21 6C-22-12-10-18 0-18s22 6 21 24" stroke="#c026d3" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M-18-4C-14-13-6-15 0-15" stroke="#f5d0fe" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <rect x="-26" y="0" width="9" height="13" rx="4" fill="#1f2937" />
          <rect x="17" y="0" width="9" height="13" rx="4" fill="#1f2937" />
          <circle cx="-21.5" cy="6.5" r="2.2" fill="#e879f9" />
          <circle cx="21.5" cy="6.5" r="2.2" fill="#e879f9" />
          {/* The boom, curling round to the mouth, with its little mic. */}
          <path d="M22 13c2 10-2 18-12 20" stroke="#9ca3af" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <ellipse cx="8" cy="33.5" rx="4.4" ry="3.4" fill="#374151" />
          <ellipse cx="7" cy="32.6" rx="1.4" ry="1" fill="#9ca3af" />
        </g>
      );
    case "gat":
      return (
        <g>
          {/* A scholar's hat of fine black horsehair: see-through brim, tall crown, amber beads. */}
          <ellipse cx="0" cy="-1" rx="31" ry="7" fill="#111827" opacity="0.72" />
          <ellipse cx="0" cy="-1" rx="31" ry="7" fill="none" stroke="#111827" strokeWidth="1.6" />
          <path d="M-24-1h48" stroke="#4b5563" strokeWidth="0.8" opacity="0.6" />
          <path d="M-11-2l1.4-22q9.6-3 19.2 0L11-2z" fill="#111827" opacity="0.9" />
          <path d="M-7-20q7-2 14 0" stroke="#6b7280" strokeWidth="1" fill="none" />
          <path d="M-11-5q11 3 22 0" stroke="#374151" strokeWidth="2.4" fill="none" />
          {[-1, 1].map((side) => (
            <g key={side}>
              {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={side * (26 - i * 0.8)} cy={4 + i * 4.2} r="2" fill={i % 2 ? "#dc2626" : "#f59e0b"} />
              ))}
            </g>
          ))}
        </g>
      );
    case "magpie":
      return (
        <g>
          {/* A cheeky magpie friend perched up top, in its own tiny gat. */}
          <path d="M-8-10l-22 6 4-5-4-2z" fill="#1e3a8a" />
          <path d="M-8-9l-19 3" stroke="#3b82f6" strokeWidth="1.2" />
          <ellipse cx="0" cy="-10" rx="12" ry="9" fill="#111827" />
          <ellipse cx="2" cy="-7" rx="7" ry="5.4" fill="#f8fafc" />
          <path d="M-9-12q7-6 14 0-6 6-14 0z" fill="#1d4ed8" />
          <path d="M-7-12q5-3 10 0" stroke="#60a5fa" strokeWidth="1.2" fill="none" />
          <circle cx="9" cy="-20" r="7" fill="#111827" />
          <path d="M15-21l7 2-7 2z" fill="#f59e0b" />
          <circle cx="11" cy="-21.5" r="1.9" fill="#fff" />
          <circle cx="11.5" cy="-21.5" r="1" fill="#111827" />
          <path d="M-2-1v2M3-1v2" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
          <g transform="translate(9 -26)">
            <ellipse cx="0" cy="0" rx="10" ry="2.4" fill="#111827" opacity="0.75" />
            <path d="M-4-1l.6-7q3.4-1 6.8 0L4-1z" fill="#111827" />
            <circle cx="-9" cy="3" r="1" fill="#f59e0b" />
            <circle cx="9" cy="3" r="1" fill="#f59e0b" />
          </g>
        </g>
      );
    case "goldenNecklace":
      return (
        <g>
          <path d="M-20-2q20 12 40 0" stroke={GOLD_DARK} strokeWidth="2.4" fill="none" />
          <path d="M-20-2q20 12 40 0" stroke={GOLD} strokeWidth="1.2" fill="none" strokeDasharray="2.4 2" />
          <circle cx="0" cy="15" r="12" fill="#fde68a" opacity="0.45" />
          <path d={star(0, 15, 9, 4)} fill={GOLD} stroke={GOLD_DARK} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="0" cy="15" r="2.4" fill="#fff7ed" />
          <path d="M-12 8l-2-2M12 8l2-2M0 29v2" stroke="#fde047" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case "starShades":
      return profile ? (
        <g>
          <path d={star(0, 0, 10, 4.6)} fill="#e879f9" stroke="#86198f" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M-9-2l-16-1" stroke="#86198f" strokeWidth="2" strokeLinecap="round" />
          <path d="M-3-3l3-2" stroke="#fdf4ff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {[-11, 11].map((x) => (
            <path key={x} d={star(x, 0, 10, 4.6)} fill="#e879f9" stroke="#86198f" strokeWidth="1.4" strokeLinejoin="round" />
          ))}
          <path d="M-3-1q3-3 6 0M-20-2l-5-2M20-2l5-2" stroke="#86198f" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M-14-3l3-2M8-3l3-2" stroke="#fdf4ff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case "hunterSword":
      return (
        <g>
          {/*
            A demon hunter's four-star sword in its sheath, slung on the back,
            drawn from the tip at the bottom left to the hilt at the top right.
          */}
          <path d="M-14 16L-28 34" stroke="#312e81" strokeWidth="3" strokeLinecap="round" />
          <path d="M-30 36l-4 6 6-3z" fill="#c7d2fe" />
          <path d="M-24 30L14-18" stroke="#4c1d95" strokeWidth="8" strokeLinecap="round" />
          <path d="M-22 27L12-16" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          {[-12, -2, 8].map((y, i) => (
            <path key={y} d={`M${-12 + i * 8.6 - 4} ${y + 13 - i * 1.2}l6 5`} stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
          ))}
          <path d="M9-25l14 11" stroke={GOLD} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M18-22L28-35" stroke="#1f2937" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M19.5-24.5l2.5 2M22.5-28.5l2.5 2M25.5-32.5l2.5 2" stroke="#9ca3af" strokeWidth="1.4" />
          <circle cx="29.5" cy="-37" r="3.4" fill={GOLD} stroke={GOLD_DARK} strokeWidth="1" />
          {/* Four little stars along the sheath. */}
          {(
            [
              [-17, 21],
              [-9, 11],
              [-1, 1],
              [7, -9],
            ] as const
          ).map(([x, y]) => (
            <path key={`${x}-${y}`} d={star(x, y, 2.6, 1.1)} fill="#fde047" />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** A five-pointed star centred on (cx, cy), point up. */
function star(cx: number, cy: number, outer: number, inner: number): string {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;
  });
  return `M${points.join("L")}z`;
}

/** How to frame each wearable slot for a shop tile, as a viewBox around the unit drawing. */
const PREVIEW_BOX = {
  hat: "-34 -52 68 62",
  neck: "-30 -14 60 50",
  face: "-30 -18 60 36",
  back: "-48 -46 96 88",
} as const;

/** One accessory on its own, framed for the wardrobe grid. */
export function AccessoryPreview({
  id,
  slot,
  className,
}: {
  id: string;
  slot: keyof typeof PREVIEW_BOX;
  className?: string;
}) {
  return (
    <svg viewBox={PREVIEW_BOX[slot]} className={className} aria-hidden>
      <AccessoryShape id={id} />
    </svg>
  );
}
