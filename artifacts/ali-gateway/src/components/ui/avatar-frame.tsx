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

// ── Ambassador decoration: eagle wings curving down alongside the avatar circle ─
function Wings({ size }: { size: number }) {
  const R      = size / 2;
  const padX   = Math.round(size * 0.21);
  const padTop = Math.round(size * 0.05);
  const totalW = size + padX * 2;
  const totalH = size + padTop;

  const cX = padX + R;
  const cY = padTop + R;

  // Point on circle at angle deg (0°=right, 90°=top in standard math)
  const pt = (deg: number) => ({
    x: parseFloat((cX + R * Math.cos(deg * Math.PI / 180)).toFixed(2)),
    y: parseFloat((cY - R * Math.sin(deg * Math.PI / 180)).toFixed(2)),
  });

  // Main wing body path
  // right=false → left wing (hugs left side, 11→8 o'clock)
  // right=true  → right wing (hugs right side, 1→4 o'clock)
  const wingPath = (right: boolean): string => {
    const f   = right ? -1 : 1;            // direction sign: -1=rightward, 1=leftward
    const a1  = right ? 60  : 120;          // upper attachment angle
    const a2  = right ? -30 : 210;          // lower attachment angle
    const sw  = right ? 0   : 1;            // arc sweep (0=CCW, 1=CW in SVG)
    const top = pt(a1);
    const bot = pt(a2);
    const ext = padX * 0.88;               // max outward extension

    // Outer edge bezier waypoints
    const p1x = +(top.x - f * padX * 0.58).toFixed(2);
    const p1y = +(top.y - size * 0.05).toFixed(2);
    const p2x = +(cX    - f * (R + ext * 0.85)).toFixed(2);
    const p2y = +(cY    - R * 0.68).toFixed(2);
    const p3x = +(cX    - f * (R + ext)).toFixed(2);     // widest point
    const p3y = +(cY    - R * 0.10).toFixed(2);
    const p4x = +(cX    - f * (R + ext * 0.82)).toFixed(2);
    const p4y = +(cY    + R * 0.46).toFixed(2);
    const p5x = +(bot.x - f * padX * 0.28).toFixed(2);
    const p5y = +(bot.y - size * 0.03).toFixed(2);

    return [
      `M ${top.x} ${top.y}`,
      `C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3x} ${p3y}`,
      `C ${p4x} ${p4y}, ${p5x} ${p5y}, ${bot.x} ${bot.y}`,
      `A ${R} ${R} 0 0 ${sw} ${top.x} ${top.y}`,
      'Z',
    ].join(' ');
  };

  // Inner highlight layer (bright inner facet facing the circle)
  const hlPath = (right: boolean): string => {
    const f   = right ? -1 : 1;
    const a1  = right ? 65  : 115;
    const a2  = right ? -25 : 205;
    const sw  = right ? 0   : 1;
    const top = pt(a1);
    const bot = pt(a2);
    const ext = padX * 0.48;

    const mx  = +(cX - f * (R + ext)).toFixed(2);
    const my  = +(cY - R * 0.08).toFixed(2);

    return [
      `M ${top.x} ${top.y}`,
      `C ${+(top.x - f * padX * 0.28).toFixed(2)} ${+(top.y - size * 0.03).toFixed(2)},`,
      `  ${mx} ${+(cY - R * 0.50).toFixed(2)}, ${mx} ${my}`,
      `C ${mx} ${+(cY + R * 0.26).toFixed(2)},`,
      `  ${+(bot.x - f * padX * 0.14).toFixed(2)} ${+(bot.y - size * 0.02).toFixed(2)},`,
      `  ${bot.x} ${bot.y}`,
      `A ${R} ${R} 0 0 ${sw} ${top.x} ${top.y}`,
      'Z',
    ].join(' ');
  };

  // Primary feather quill lines radiating from circle outward (eagle feather detail)
  const quills = (right: boolean) => {
    const f = right ? -1 : 1;
    const startDeg = right ? 60  : 120;
    const endDeg   = right ? -30 : 210;
    return Array.from({ length: 5 }, (_, i) => {
      const t   = (i + 0.5) / 5;
      const deg = startDeg + (endDeg - startDeg) * t;
      const c   = pt(deg);
      const nx  = Math.cos(deg * Math.PI / 180);
      const ny  = -Math.sin(deg * Math.PI / 180);
      const ext = padX * (0.80 - 0.28 * Math.abs(t - 0.5) * 2);
      const ox  = +(c.x - f * Math.abs(nx) * ext).toFixed(2);
      const oy  = +(c.y + ny * ext * 0.12).toFixed(2);
      return (
        <line key={`${right ? 'r' : 'l'}${i}`}
          x1={c.x} y1={c.y} x2={ox} y2={oy}
          stroke="#f5d76e" strokeWidth={Math.max(0.4, size * 0.005)} opacity={0.32} />
      );
    });
  };

  const sw = Math.max(0.5, size * 0.007);

  return (
    <svg width={totalW} height={totalH}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      overflow="visible">
      <defs>
        <linearGradient id="wg-l" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff8c8" />
          <stop offset="22%"  stopColor="#f5d76e" />
          <stop offset="60%"  stopColor="#d4af37" />
          <stop offset="100%" stopColor="#7a4e00" />
        </linearGradient>
        <linearGradient id="wg-r" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#fff8c8" />
          <stop offset="22%"  stopColor="#f5d76e" />
          <stop offset="60%"  stopColor="#d4af37" />
          <stop offset="100%" stopColor="#7a4e00" />
        </linearGradient>
        <filter id="wglow" x="-40%" y="-20%" width="180%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g filter="url(#wglow)">
        <path d={wingPath(false)} fill="url(#wg-l)" opacity={0.94} />
        <path d={wingPath(true)}  fill="url(#wg-r)" opacity={0.94} />
      </g>
      <path d={hlPath(false)} fill="#fff8c0" opacity={0.45} />
      <path d={hlPath(true)}  fill="#fff8c0" opacity={0.45} />
      {quills(false)}
      {quills(true)}
      <path d={wingPath(false)} fill="none" stroke="#f0d060" strokeWidth={sw} opacity={0.55} />
      <path d={wingPath(true)}  fill="none" stroke="#f0d060" strokeWidth={sw} opacity={0.55} />
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

  const padX   = isGuardian ? Math.round(size * 0.44) : isAmbassador ? Math.round(size * 0.21) : 0;
  const padTop = isAmbassador ? Math.round(size * 0.05) : 0;
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
