import type { FeedItem } from "@/lib/types";
import { StoryCard } from "./StoryCard";

export function FeaturedArticleCard({ item, onSave }: { item: FeedItem; onSave: (id: string) => void }) {
  return <StoryCard item={item} onSave={onSave} featured />;
}
