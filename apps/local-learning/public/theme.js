const storageKey = "learning-atlas-theme";
const preferences = ["system", "light", "dark"];
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

export function themePreference() {
  try {
    const value = localStorage.getItem(storageKey);
    return preferences.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(preference = themePreference()) {
  const dark = preference === "dark" || (preference === "system" && systemTheme.matches);
  const resolved = dark ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function saveTheme(preference) {
  if (!preferences.includes(preference)) return applyTheme();
  try {
    localStorage.setItem(storageKey, preference);
  } catch {
    // The visual preference can still apply when storage is unavailable.
  }
  return applyTheme(preference);
}

export function themeSelect(preference = themePreference(), id = "page-theme-select") {
  return `<label class="theme-control" for="${id}"><span>主题</span><select id="${id}" name="theme" aria-label="主题"><option value="system"${preference === "system" ? " selected" : ""}>跟随系统</option><option value="light"${preference === "light" ? " selected" : ""}>浅色</option><option value="dark"${preference === "dark" ? " selected" : ""}>深色</option></select></label>`;
}

export function observeSystemTheme(callback) {
  const listener = () => {
    if (themePreference() !== "system") return;
    applyTheme("system");
    callback?.();
  };
  systemTheme.addEventListener("change", listener);
  return () => systemTheme.removeEventListener("change", listener);
}

export function mermaidTheme() {
  const styles = getComputedStyle(document.documentElement);
  const color = name => styles.getPropertyValue(name).trim();
  return { startOnLoad: false, securityLevel: "strict", theme: "base", themeVariables: {
    background: color("--color-surface"), primaryColor: color("--color-surface"), primaryTextColor: color("--color-ink"),
    primaryBorderColor: color("--color-primary"), lineColor: color("--color-primary"), secondaryColor: color("--color-canvas"),
    tertiaryColor: color("--color-primary-pale"), clusterBkg: color("--color-canvas"), clusterBorder: color("--color-border"),
    fontFamily: styles.getPropertyValue("--font-sans").trim()
  } };
}
