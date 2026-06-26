import { cn } from "@/lib/utils";

/**
 * Dependency-free, deterministic QR-style visual derived from the pass
 * token. It is NOT a scannable QR code — it's a recognizable, stable
 * placeholder for the demo. A real QR generator can drop in later behind
 * the same component API.
 */
export function QrToken({
  token,
  className,
}: {
  token: string;
  className?: string;
}) {
  const size = 11;
  const cells: boolean[] = [];

  // Simple, stable hash expansion so the same token always renders the same.
  let seed = 0;
  for (let i = 0; i < token.length; i++) {
    seed = (seed * 31 + token.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    cells.push((seed >> 5) % 2 === 0);
  }

  return (
    <div
      className={cn(
        "grid aspect-square w-32 overflow-hidden rounded-md border bg-white p-2",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      aria-label="Pass code"
    >
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-primary" : "bg-transparent"} />
      ))}
    </div>
  );
}
