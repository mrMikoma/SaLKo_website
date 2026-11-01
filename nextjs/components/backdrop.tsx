import Image from "next/image";

// Photos behind heroes and sections. As next/image they are resized for the
// screen and served as WebP, and the ones further down load only when they
// come near the viewport. As CSS background images every one of them was
// downloaded in full before the first paint (docs/SEO_PLAN.md, 2.2).
export const BACKDROPS = {
  olavinlinna: "/images/olavinlinna_1.jpg",
  punkaharju: "/images/punkaharju_1.jpg",
  savonlinna: "/images/savonlinna_1.jpg",
  efsa: "/images/EFSA/efsa_1.jpg",
  ohconApron: "/images/OH-CON/ohcon_1.jpg",
  ohconFlight: "/images/OH-CON/ohcon_2.jpg",
  ohconClouds: "/images/OH-CON/ohcon_3.jpg",
  oh386: "/images/OH-386/oh386_1.jpg",
  certificate: "/images/certificate_1.jpg",
} as const;

export type BackdropName = keyof typeof BACKDROPS;

// Covers the nearest positioned ancestor; render it as that element's first
// child so the overlay and content after it paint on top. Preload the one at
// the top of the page, which can be its largest paint. Quality 50 is enough
// under the dark gradients these photos sit behind, at about 30 % fewer bytes than 75.
export default function Backdrop({ name, preload = false }: { name: BackdropName; preload?: boolean }) {
  return (
    <Image src={BACKDROPS[name]} alt="" fill sizes="100vw" quality={50} preload={preload} className="object-cover" />
  );
}
