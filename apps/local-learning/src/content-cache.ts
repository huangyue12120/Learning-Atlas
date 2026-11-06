import * as fs from "node:fs";

// Every dependency is checked before reuse, including missing files
// and directory listings. Timestamps/size invalidate; SHA-256 remains the gate.
type Entry = { value: unknown; dependencies: Map<string, string> };
const entries = new Map<string, Entry>();
let collecting: Map<string, string> | null = null;
let checking: Map<string, string> | null = null;
function stamp(path: string) {
  if (checking?.has(path)) return checking.get(path)!;
  let value: string;
  try {
    const stat = fs.statSync(path, { bigint: true });
    value = version(stat);
  } catch { value = "missing"; }
  checking?.set(path, value);
  return value;
}
function track(path: fs.PathLike) {
  collecting?.set(String(path), stamp(String(path)));
}
export function existsSync(path: fs.PathLike) { track(path); return fs.existsSync(path); }
export function readFileSync(path: any, options?: any): any { track(path); return fs.readFileSync(path, options); }
export function readdirSync(path: any, options?: any): any { track(path); return fs.readdirSync(path, options); }
export function cachedFiles<T>(key: string, compute: () => T): T {
  const outer = collecting;
  const outerCheck = checking;
  checking ??= new Map();
  try {
    let entry = entries.get(key);
    if (!entry || [...entry.dependencies].some(([path, version]) => stamp(path) !== version)) {
      collecting = new Map();
      const value = compute();
      entry = { value, dependencies: collecting };
      entries.set(key, entry);
    }
    if (outer) for (const [path, version] of entry.dependencies) outer.set(path, version);
    return entry.value as T;
  } finally { collecting = outer; checking = outerCheck; }
}

function version(value: fs.BigIntStats) {
  return `${value.mtimeNs}:${value.ctimeNs}:${value.size}:${value.ino}`;
}

// Refresh all known dependencies before using an index. Only the checks run
// concurrently; index rebuilding and SHA gates remain synchronous and fail closed.
export async function withFreshFiles<T>(keys: string[], compute: () => T): Promise<T> {
  const paths = new Set(keys.flatMap(key => [...(entries.get(key)?.dependencies.keys() ?? [])]));
  const fresh = new Map<string, string>();
  if (paths.size) await new Promise<void>(resolve => {
    let remaining = paths.size;
    for (const path of paths) fs.stat(path, { bigint: true }, (error, value) => {
      fresh.set(path, error ? "missing" : version(value));
      if (--remaining === 0) resolve();
    });
  });
  const outer = checking;
  checking = fresh;
  try { return compute(); }
  finally { checking = outer; }
}
