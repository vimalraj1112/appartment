import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { pageVariants } from "./variants";

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
