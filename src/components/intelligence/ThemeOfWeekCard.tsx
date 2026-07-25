"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export function ThemeOfWeekCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl overflow-hidden border border-[var(--border)]"
    >
      <div className="h-40 relative">
        <img
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80"
          alt="Coastal lighthouse guiding the way"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-950)]/80 via-[var(--navy-950)]/30 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
            Theme of the Week
          </span>
        </div>
      </div>
      <div className="p-4 bg-white">
        <h3 className="font-editorial text-lg font-bold text-[var(--navy-950)] leading-tight mb-1">
          AI Copilots for Revenue Teams
        </h3>
        <p className="text-xs text-[var(--slate-700)] leading-relaxed mb-3">
          How leading teams use AI copilots to automate work, improve decisions
          and accelerate GTM impact.
        </p>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--coral-500)] hover:text-[var(--coral-300)] transition-colors">
          Explore theme
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
