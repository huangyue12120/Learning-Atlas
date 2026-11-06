try {
  const preference = localStorage.getItem("learning-atlas-theme");
  const dark = preference === "dark" || (preference !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
} catch { document.documentElement.dataset.theme = "light"; }
