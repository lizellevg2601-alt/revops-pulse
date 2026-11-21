import { Bookmark } from "lucide-react";
import type { FeedItem } from "@/lib/types";

export function SaveStoryButton({ item, onSave, inverted = false }: { item: FeedItem; onSave: (id: string) => void; inverted?: boolean }) {
  return <button type="button" onClick={() => onSave(item.id)} aria-pressed={item.saved}
    aria-label={`${item.saved ? "Unsave" : "Save"} story: ${item.title}`}
    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${inverted ? "hover:bg-white/10" : "hover:bg-[var(--coral-50)]"}`}>
    <Bookmark aria-hidden="true" className={`h-4 w-4 ${item.saved ? "fill-[var(--coral-500)] text-[var(--coral-500)]" : inverted ? "text-white/75" : "text-[var(--slate-500)]"}`} />
  </button>;
}
