import * as fs from "node:fs";

// Every dependency is checked synchronously before reuse, including missing files
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
    value = `${stat.mtimeNs}:${stat.ctimeNs}:${stat.size}:${stat.ino}`;
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
