import { FUZZY_THRESHOLD } from "../constants";

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const dist = Math.max(Math.floor(Math.max(a.length, b.length) / 2) - 1, 0);
  const aM = new Array(a.length).fill(false);
  const bM = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (
      let j = Math.max(0, i - dist);
      j < Math.min(i + dist + 1, b.length);
      j++
    ) {
      if (!bM[j] && a[i] === b[j]) {
        aM[i] = bM[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;
  let t = 0,
    k = 0;
  for (let i = 0; i < a.length; i++) {
    if (aM[i]) {
      while (!bM[k]) k++;
      if (a[i] !== b[k++]) t++;
    }
  }
  return (
    (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3
  );
}

function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  let p = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length) && a[i] === b[i]; i++)
    p++;
  return j + p * 0.1 * (1 - j);
}

export function fuzzyFindBills<T extends { id: number; name: string }>(
  query: string,
  candidates: T[],
): T[] {
  const q = normalize(query);
  const qWords = q.split(" ");
  return candidates
    .map((c) => {
      const norm = normalize(c.name);
      const nWords = norm.split(" ");
      const score = Math.min(
        ...qWords.map((qw) => Math.max(...nWords.map((nw) => jaroWinkler(qw, nw)))),
      );
      return { c, score };
    })
    .filter((x) => x.score >= FUZZY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}
