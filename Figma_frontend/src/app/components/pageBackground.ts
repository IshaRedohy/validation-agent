const noiseUrl = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.45'/%3E%3C/svg%3E")`;

export const pageBackgroundStyle = {
  backgroundImage: `
    ${noiseUrl},
    radial-gradient(ellipse 58% 32% at 30% 63%, rgba(147,51,234,0.32) 0%, transparent 100%),
    radial-gradient(ellipse 55% 30% at 70% 37%, rgba(196,132,255,0.28) 0%, transparent 100%),
    radial-gradient(ellipse 15% 12% at 1% 99%, rgba(70,0,115,0) 0%, transparent 100%)
  `,
  backgroundSize: '180px 180px, auto, auto, auto',
  backgroundColor: '#fcfaff',
} as const;
