import type { Variants } from "framer-motion";

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

export const cardStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const cardItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

export const hoverLift = {
  whileHover: { y: -3 },
  whileTap: { scale: 0.99 },
} as const;
