"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";

export function Countdown({
  endsAt,
  serverNow,
  className,
}: {
  endsAt: string | null;
  serverNow: string;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const serverMs = new Date(serverNow).getTime();
    const offset = Date.now() - serverMs;

    function tick() {
      if (!endsAt) {
        setRemaining(0);
        return;
      }
      const seconds = Math.max(
        0,
        Math.floor((new Date(endsAt).getTime() - (Date.now() - offset)) / 1000),
      );
      setRemaining(seconds);
    }

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [endsAt, serverNow]);

  return (
    <span className={className} suppressHydrationWarning>
      {formatClock(remaining)}
    </span>
  );
}
