import { motion } from "framer-motion";

interface AliEmblemProps {
  className?: string;
  animate?: boolean;
}

export const AliEmblem = ({ className = "", animate = true }: AliEmblemProps) => {
  if (!animate) {
    return (
      <img
        src="/ali-emblem.jpg"
        alt="A.L.I. Emblem"
        className={`object-contain ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <motion.img
      src="/ali-emblem.jpg"
      alt="A.L.I. Emblem"
      className={`object-contain ${className}`}
      draggable={false}
      initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    />
  );
};
