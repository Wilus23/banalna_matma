export type RNG = () => number;

export const createSeededRng = (seed: number): RNG => {
  let t = seed >>> 0;

  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export const toSafeSeed = (seed: number | undefined): number => {
  if (typeof seed !== 'number' || !Number.isFinite(seed)) {
    return Date.now();
  }

  return Math.floor(Math.abs(seed)) || Date.now();
};
