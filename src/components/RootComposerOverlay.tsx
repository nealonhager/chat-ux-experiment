import { motion } from "motion/react";
import { ViewportPortal } from "@xyflow/react";

import { ChatInputBar } from "@/components/ChatInputBar";
import { useConversationFlow } from "@/components/useConversationFlow";
import type { WorldRect } from "@/lib/canvasLayout";

const COMPOSER_MOTION = {
  duration: 0.24,
  ease: [0.4, 0, 0.2, 1] as const,
};

type RootComposerOverlayProps = {
  slot: WorldRect;
};

export function RootComposerOverlay({ slot }: RootComposerOverlayProps) {
  const { composer } = useConversationFlow();

  if (!composer) {
    return null;
  }

  return (
    <ViewportPortal>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={COMPOSER_MOTION}
        className="nodrag nopan pointer-events-auto absolute"
        style={{
          left: slot.x,
          top: slot.y,
          width: slot.width,
          minHeight: slot.height,
        }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ChatInputBar size="mini" {...composer} />
      </motion.div>
    </ViewportPortal>
  );
}
