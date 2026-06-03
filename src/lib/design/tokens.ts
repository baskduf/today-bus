export const obColors = {
  bg: "#FFFFFF",
  mint: "#111111",
  green: "#111111",
  greenDeep: "#000000",
  card: "#FFFFFF",
  text: "#111111",
  text2: "#555555",
  coral: "#111111",
  coralDeep: "#000000",
  yellow: "#F2F2F2",
  ink: "#111111",
  inkSoft: "#222222",
} as const;

export const obRadii = {
  card: "ob-card",
  r2: "ob-r2",
  r3: "ob-r3",
  pill: "ob-pill",
} as const;

export const obShadows = {
  card: "0 8px 18px rgba(0,0,0,0.08)",
  button: "0 6px 0 var(--ob-button-border), 0 10px 16px rgba(0,0,0,0.14)",
} as const;

export const obButtonKinds = {
  primary: {
    bg: obColors.text,
    border: obColors.text,
    color: "#FFFFFF",
  },
  soft: {
    bg: "#FFFFFF",
    border: obColors.text,
    color: obColors.text,
  },
  coral: {
    bg: obColors.text,
    border: obColors.text,
    color: "#FFFFFF",
  },
  ghost: {
    bg: obColors.card,
    border: obColors.text,
    color: obColors.text,
  },
} as const;

export type ObColor = keyof typeof obColors;
export type ObRadius = keyof typeof obRadii;
export type ObButtonKind = keyof typeof obButtonKinds;
