import { motion } from "framer-motion";

export const AliEmblem = ({ className = "" }: { className?: string }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      initial="hidden"
      animate="visible"
    >
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow */}
      <circle cx="50" cy="50" r="45" fill="url(#sunGlow)" />

      {/* 16-ray Sun */}
      {[...Array(16)].map((_, i) => (
        <motion.line
          key={i}
          x1="50"
          y1="50"
          x2="50"
          y2="5"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${(i * 360) / 16} 50 50)`}
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { 
              pathLength: 1, 
              opacity: 1,
              transition: { 
                delay: i * 0.05, 
                duration: 0.8,
                ease: "easeOut"
              } 
            }
          }}
        />
      ))}

      {/* Center Circle */}
      <motion.circle
        cx="50"
        cy="50"
        r="20"
        fill="hsl(var(--background))"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        variants={{
          hidden: { scale: 0, opacity: 0 },
          visible: { 
            scale: 1, 
            opacity: 1,
            transition: { delay: 0.8, duration: 0.5, type: "spring" }
          }
        }}
      />

      {/* Reaching Hand */}
      <motion.path
        d="M 45 60 C 45 50, 48 45, 48 40 C 48 35, 52 35, 52 40 C 52 45, 55 50, 55 60 Z M 48 40 L 46 32 C 45 30, 47 28, 48 30 L 49 38 M 52 40 L 54 32 C 55 30, 53 28, 52 30 L 51 38 M 49 40 L 50 28 C 50 26, 52 26, 51 28 L 51 40"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { 
            pathLength: 1, 
            opacity: 1,
            transition: { delay: 1.2, duration: 1, ease: "easeInOut" }
          }
        }}
      />
    </motion.svg>
  );
};
