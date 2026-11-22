// In-memory student directory (resets on server restart; fine for a demo on a single Node server).
const g = globalThis as any;
export const registry: Map<string, { userId: string; name: string; subject: string; seen: number }> =
  g.__reg || (g.__reg = new Map());
