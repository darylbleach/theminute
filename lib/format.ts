export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function remainingParts(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return { hours, minutes, seconds, totalSeconds: safe };
}

export function formatClock(totalSeconds: number) {
  const { hours, minutes, seconds } = remainingParts(totalSeconds);
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatDuration(totalSeconds: number) {
  const { hours, minutes, seconds } = remainingParts(totalSeconds);
  if (hours > 0) {
    return `${hours}h ${pad2(minutes)}m`;
  }
  if (minutes > 0) {
    return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export function secondsBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
}
