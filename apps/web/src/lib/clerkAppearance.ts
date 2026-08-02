// Minimal skin so Clerk's hosted forms don't clash with the paper design
// system — chrome carries the period, but Clerk's own form UI is
// necessarily generic. Keeps colors/fonts consistent, doesn't attempt to
// fully re-theme Clerk's internal layout.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#8e2b22",
    colorText: "#211b14",
    colorTextSecondary: "#574b3c",
    colorBackground: "#f5efe1",
    colorInputBackground: "#f5efe1",
    colorInputText: "#211b14",
    borderRadius: "0px",
    fontFamily: "'Courier Prime', monospace",
  },
  elements: {
    card: "shadow-none border border-[#c0ae8c] bg-[#f5efe1]",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
  },
};
