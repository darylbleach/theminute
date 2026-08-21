import { Takeover } from "@/components/takeover";
import { loadPublicState } from "@/lib/queue";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let state = null;
  try {
    state = await loadPublicState();
  } catch {
    state = null;
  }
  return <Takeover initial={state} />;
}
