import { motion } from "framer-motion";
import type { ReactNode } from "react";

const GOLD  = "#d4af37";
const GOLD2 = "#f0d060";
const GOLD3 = "#a07820";

// ── Guardian decoration: two swords flanking the avatar ─────────────────────
function Swords({ size }: { size: number }) {
  const padX   = Math.round(size * 0.44);
  const totalW = size + padX * 2;
  const totalH = size;

  const lx = padX * 0.5;
  const rx = totalW - padX * 0.5;
  const cy = totalH * 0.52;

  const bh  = size * 0.36;   // blade height
  const bw  = size * 0.038;  // blade half-width at base
  const gh  = size * 0.052;  // guard height
  const gw  = size * 0.19;   // guard half-width
  const hh  = size * 0.17;   // handle height
  const hw  = size * 0.033;  // handle half-width
  const pr  = size * 0.072;  // pommel rx
  const tilt = 18;

  return (
    <svg
      width={totalW} height={totalH}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      overflow="visible"
    >
      {[
        { cx: lx, rot: -tilt },
        { cx: rx, rot:  tilt },
      ].map(({ cx, rot }, i) => (
        <g key={i} transform={`translate(${cx},${cy}) rotate(${rot})`}>
          {/* Blade */}
          <path d={`M0,${-(bh+gh)} L${-bw},${-gh} L${bw},${-gh} Z`} fill={GOLD} />
          {/* Blade highlight */}
          <path d={`M${bw*0.12},${-(bh+gh)} L${bw*0.18},${-gh*1.6} L0,${-(bh*0.55+gh)} Z`} fill={GOLD2} opacity={0.55} />
          {/* Guard */}
          <rect x={-gw} y={-gh} width={gw*2} height={gh} rx={gh*0.4} fill={GOLD} />
          {/* Handle */}
          <rect x={-hw} y={0} width={hw*2} height={hh} rx={hw*0.7} fill={GOLD3} />
          {/* Pommel */}
          <ellipse cx={0} cy={hh + pr*0.65} rx={pr} ry={pr*0.62} fill={GOLD} />
        </g>
      ))}
    </svg>
  );
}

// ── Ambassador decoration: two angel wings flanking the avatar ───────────────
function Wings({ size }: { size: number }) {
  const padX   = Math.round(size * 0.52);
  const padTop = Math.round(size * 0.18);
  const totalW = size + padX * 2;
  const totalH = size + padTop;

  const leftEdge  = padX;
  const rightEdge = padX + size;
  const cy        = padTop + size * 0.52;

  const ext = padX * 0.86;   // horizontal spread
  const fh  = size * 0.38;   // feather vertical extent

  const featherPaths = (side: 1 | -1) => (
    <g>
      {/* Primary feather — largest */}
      <path
        d={`M0,${-fh*0.22} Q${side*ext*0.45},${-fh*1.08} ${side*ext},${-fh*0.38} Q${side*ext*0.58},${fh*0.18} 0,${fh*0.4} Z`}
        fill={GOLD} opacity={0.92}
      />
      {/* Secondary feather */}
      <path
        d={`M0,${fh*0.08} Q${side*ext*0.38},${-fh*0.52} ${side*ext*0.8},${-fh*0.08} Q${side*ext*0.43},${fh*0.32} 0,${fh*0.52} Z`}
        fill={GOLD2} opacity={0.80}
      />
      {/* Tertiary / inner feather */}
      <path
        d={`M0,${fh*0.28} Q${side*ext*0.24},${-fh*0.1} ${side*ext*0.5},${fh*0.16} Q${side*ext*0.26},${fh*0.46} 0,${fh*0.58} Z`}
        fill={GOLD3} opacity={0.72}
      />
      {/* Quill line */}
      <line
        x1={0} y1={fh*0.04}
        x2={side*ext*0.62} y2={-fh*0.38}
        stroke={GOLD2} strokeWidth={Math.max(0.8, size*0.013)} opacity={0.45}
      />
    </g>
  );

  return (
    <svg
      width={totalW} height={totalH}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      overflow="visible"
    >
      <g transform={`translate(${leftEdge},${cy})`}>{featherPaths(-1)}</g>
      <g transform={`translate(${rightEdge},${cy})`}>{featherPaths(1)}</g>
    </svg>
  );
}

// ── Public AvatarFrame component ─────────────────────────────────────────────
interface AvatarFrameProps {
  photoUrl?:  string | null;
  initials:   string;
  civicRole?: string | null;
  size:       number;
  accent:     string;
  isSpeaking?: boolean;
  badge?:     ReactNode;
  onClick?:   () => void;
}

export function AvatarFrame({
  photoUrl, initials, civicRole, size, accent, isSpeaking, badge, onClick,
}: AvatarFrameProps) {
  const isGuardian   = civicRole === "guardian";
  const isAmbassador = civicRole === "ambassador";

  const padX   = isGuardian ? Math.round(size * 0.44) : isAmbassador ? Math.round(size * 0.52) : 0;
  const padTop = isAmbassador ? Math.round(size * 0.18) : 0;
  const totalW = size + padX * 2;
  const totalH = size + padTop;

  const borderW = Math.max(2, Math.round(size * 0.038));

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: totalW, height: totalH + 4 }}
    >
      {isGuardian   && <Swords size={size} />}
      {isAmbassador && <Wings  size={size} />}

      <motion.div
        onClick={onClick}
        animate={
          isSpeaking
            ? { boxShadow: [`0 0 0 0 ${accent}70`, `0 0 ${Math.round(size*0.15)}px ${Math.round(size*0.09)}px ${accent}00`] }
            : {}
        }
        transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        className="rounded-full flex items-center justify-center font-mono font-black overflow-hidden"
        style={{
          position: "absolute",
          left: padX,
          top:  padTop,
          width: size,
          height: size,
          background: photoUrl ? undefined : `linear-gradient(135deg,${accent}35,${accent}10)`,
          border:     `${borderW}px solid ${accent}`,
          fontSize:   Math.round(size * 0.3),
          color:      accent,
          zIndex:     2,
          cursor:     onClick ? "pointer" : undefined,
        }}
      >
        {photoUrl
          ? <img src={photoUrl} alt={initials} className="w-full h-full object-cover" draggable={false} />
          : <span>{initials}</span>
        }
      </motion.div>

      {badge && (
        <div style={{ position: "absolute", bottom: 0, left: padX, width: size, zIndex: 3 }}>
          {badge}
        </div>
      )}
    </div>
  );
}
