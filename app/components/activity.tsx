import { AnimatePresence, motion, usePresenceData } from "motion/react";
import type React from "react";

type Direction = 1 | -1;

type ActivityProps = {
  /**
   * A stable key that changes when the "screen"/step changes.
   * This ensures only one child is present in the layout flow at a time.
   */
  activeKey: string;
  direction: Direction;
  children: React.ReactNode;
};

export function Activity({ activeKey, direction, children }: ActivityProps) {
  return (
    <AnimatePresence custom={direction} mode="wait" initial={false}>
      <ActivityContent key={activeKey}>{children}</ActivityContent>
    </AnimatePresence>
  );
}

function ActivityContent({ children }: { children: React.ReactNode }) {
  const direction = (usePresenceData() ?? 1) as Direction;

  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 50 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: {
          delay: 0.2,
          type: "spring",
          visualDuration: 0.3,
          bounce: 0.4,
        },
      }}
      exit={{
        opacity: 0,
        x: direction * -50,
        transition: { duration: 0.2, visualDuration: 0.3, bounce: 0.4 },
      }}
    >
      {children}
    </motion.div>
  );
}
