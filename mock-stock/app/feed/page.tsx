import { Suspense } from "react";
import { FeedScreen } from "@/features/f11-feed";

export default function FeedPage() {
  return (
    <Suspense>
      <FeedScreen />
    </Suspense>
  );
}
