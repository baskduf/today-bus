export const obColors = {
  bg: "#F4FBF6",
  mint: "#A8DDB5",
  green: "#6FCF97",
  greenDeep: "#4FB07A",
  card: "#FFFDF7",
  text: "#2F3A34",
  text2: "#7A8C80",
  coral: "#FF9F8A",
  coralDeep: "#F47B62",
  yellow: "#FFE08A",
  ink: "#5C8A6F",
  inkSoft: "#9CC9AD",
} as const;

export const obRadii = {
  card: "ob-card",
  r2: "ob-r2",
  r3: "ob-r3",
  pill: "ob-pill",
} as const;

export const obShadows = {
  card: "0 8px 18px rgba(79,120,90,0.10)",
  button: "0 6px 0 var(--ob-button-border), 0 10px 16px rgba(79,120,90,0.16)",
} as const;

export const obButtonKinds = {
  primary: {
    bg: obColors.green,
    border: obColors.greenDeep,
    color: "#1d3a29",
  },
  soft: {
    bg: "#EAF7EE",
    border: obColors.mint,
    color: obColors.greenDeep,
  },
  coral: {
    bg: obColors.coral,
    border: obColors.coralDeep,
    color: "#5a241a",
  },
  ghost: {
    bg: obColors.card,
    border: obColors.inkSoft,
    color: obColors.text,
  },
} as const;

export type ObColor = keyof typeof obColors;
export type ObRadius = keyof typeof obRadii;
export type ObButtonKind = keyof typeof obButtonKinds;
