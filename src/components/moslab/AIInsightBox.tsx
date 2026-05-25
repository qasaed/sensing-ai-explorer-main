import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AIInsightBox({
  title = "AI Scientific Explanation",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-primary/20 bg-primary-soft/40 p-5"
    >
      <div className="flex items-center gap-2 text-primary mb-2">
        <Sparkles className="size-4" />
        <h4 className="font-display font-semibold text-sm">{title}</h4>
      </div>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </motion.div>
  );
}
