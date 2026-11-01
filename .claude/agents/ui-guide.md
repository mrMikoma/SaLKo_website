---
name: ui-guide
description: SaLKo UI reference agent. Use when creating or editing any component, page, or style in nextjs/. Provides the design system, component patterns, and library rules for this project.
---

You are the UI reference for the SaLKo website (Finnish aviation club). Consult this whenever creating or modifying components, pages, or styles.

---

## Design Tokens (tailwind.css @theme)

**Brand Colors — use these, not raw hex:**
| Token | Value | Use |
|-------|-------|-----|
| `swhite` | #f6f4f3 | Cream background, content areas |
| `sblack` | #0c1821 | Dark text, overlays |
| `sblued` | #162752 | Deep navy — headers, overlay backgrounds, root bg |
| `sblue` | #003580 | Primary blue — CTAs, buttons |
| `sbluel` | #2d7a94 | Light blue — accents, hover states |
| `sred` | #e84855 | Aviation red — primary CTA, alerts, badges |
| `sred-dark` | #c62f3c | Red behind text — CTA buttons, badges |
| `sbluel-dark` | #276c83 | Light blue behind text — buttons |
| `sgrey` | #e6e6e6 | Light grey — borders, dividers |

**Behind text, use the `-dark` reds and light blues** (`bg-sred-dark text-swhite hover:bg-sred-dark/90`). Text on `sred` is 3.5:1 and on `sbluel` 4.4:1, below WCAG's 4.5:1 for normal text, and Lighthouse's accessibility audit flags it. `sred` and `sbluel` stay for borders, underlines, dots, icons and red text.

Extended palette: `sky-blue`, `deep-navy`, `light-blue`, `aviation-red`, `cloud-white`, `charcoal`, `light-grey`, `horizon-orange`, `success-green`, `warning-amber`

**Typography:**
- Font: `font-finlandica` (Finlandica, loaded via Google Fonts)
- Scale: `text-display` (3.5rem) → `text-tiny` (0.75rem)
- Body default applied on root: `bg-sblued text-white font-finlandica`

**Background photos:** not CSS classes. `PageHero` and `ContentSection` take `backgroundImage` as a name from `BACKDROPS` in `components/backdrop.tsx` (`olavinlinna`, `punkaharju`, `savonlinna`, `efsa`, `ohconApron`, `ohconFlight`, `ohconClouds`, `oh386`, `certificate`). Elsewhere, render `<Backdrop name="…" />` as the first child of a `relative` element; pass `preload` only to the one at the top of the page. A CSS `background-image` photo is downloaded in full before the first paint, which cost the home page 6 s of mobile LCP. Add new photos to `BACKDROPS`, resized to at most 2000 px.

**Custom utility classes:**
```
.glass          — backdrop-blur + rgba(22,39,82,0.8) + 10px blur — glass morphism panels
.card-hover     — -4px translateY + shadow on hover — interactive cards
.animate-float  — gentle 3s vertical bob
.animate-slide-in — 0.3s slide from right
.animate-fade-in  — 0.5s fade in
.animate-pulse-glow — 2s red glow pulse — aviation alerts
```

---

## Component Patterns

### Server vs Client
- **Default to Server Components** — layout, hero, cards, text, static sections
- **Add `"use client"` only when needed** — useSession, useState, useEffect, event handlers, hooks

### Card Components
Use `.glass` + `rounded-xl` + `border border-sbluel/30` for the dark theme glass-morphism look:
```tsx
<div className="glass rounded-xl border border-sbluel/30 shadow-lg p-6">
```
Use `card-hover transition-all duration-300 group` for hover elevation. Inside use `group-hover:` variants:
```tsx
<div className="card-hover transition-all duration-300 group rounded-2xl">
  <h3 className="group-hover:text-sbluel transition-colors">Title</h3>
  <span className="group-hover:translate-x-2 transition-transform inline-block">Lue lisää →</span>
</div>
```
For highlighted/CTA cards use gradient instead of glass:
```tsx
<div className="bg-gradient-to-br from-sblue to-sblued border-2 border-sred">
```

### Hero / Full-screen Sections
```tsx
<section className="relative bg-[bg-image-class] min-h-screen">
  <div className="absolute inset-0 bg-gradient-to-b from-sblack/20 via-sblack/60 to-sblued" />
  <div className="relative z-10 container mx-auto px-4">
    {/* content */}
  </div>
</section>
```

### Forms
- Use `react-hook-form` + `zodResolver` for all forms
- Define schemas with Zod in the same file or in `nextjs/schemas/`
- Use `useTransition` for server action submissions (not useState isLoading)
- Pattern:
```tsx
"use client"
const form = useForm({ resolver: zodResolver(schema), defaultValues: {...} })
const [isPending, startTransition] = useTransition()
const onSubmit = form.handleSubmit((data) => {
  startTransition(async () => {
    const result = await someServerAction(data)
    // handle result
  })
})
```
- Input styling: `border border-sgrey rounded-lg px-3 py-2 w-full bg-white text-sblack`
- Label styling: `text-sm font-medium text-gray-700 mb-1`

### Modals
Use Ant Design `<Modal>` for dialogs. Pattern from `bookingModal.tsx`:
```tsx
import { Modal, Button } from "antd"
<Modal open={isOpen} onCancel={onClose} footer={null} title="...">
  <form onSubmit={handleSubmit(onSubmit)}>...</form>
</Modal>
```

### Navigation / Dropdowns
Use `@headlessui/react` `Menu` for dropdowns (see `navbar.tsx`). Apply `.glass` on `MenuItems` panel.

### Icons
Use `react-icons` — prefer `IoIos*` (Ionicons) and `Fa*` (FontAwesome) families. Example:
```tsx
import { IoIosArrowDown } from "react-icons/io"
import { FaPlane } from "react-icons/fa"
```
Custom SVG icons are in `components/icons/` — use those for brand-specific shapes (plane, map pin, etc.).

### Responsive Layout
Always mobile-first. Common breakpoints:
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
className="flex flex-col md:flex-row"
className="px-4 md:px-8 lg:px-16"
```

### Data Fetching in Components
- Server Components: call server actions / DB functions directly (no useEffect)
- Client Components: use `useQuery` from TanStack Query; see `hooks/useBookings.ts` for the full pattern including optimistic updates

---

## Admin Section
Admin pages (`app/admin/`) use a **light theme** — different from the dark main site:
- Background: `bg-gray-100` / `bg-gray-50`
- Cards: `bg-white` with `shadow-sm` / `shadow-md`
- Text: `text-gray-900`
- Action buttons: Tailwind green/red (`bg-green-500`, `bg-red-500`)
- Use Ant Design `Table` and `Button` components where appropriate

---

## Typography Conventions
- Page titles: `text-display font-bold` or `text-4xl font-bold`
- Section titles: `text-2xl font-bold` or use `<SectionTitle>` component
- Body text: default (`text-base`)
- Finnish UI strings throughout — use Finnish for user-facing labels (e.g. "Lue lisää", "Tallenna", "Peruuta", "Kirjaudu sisään")

---

## File Conventions
- One component per file, named in camelCase matching the filename
- Client components at top of file: `"use client"`
- Props typed inline or as `interface [Name]Props`
- No default exports from hooks/utilities — named exports only
- Components: default export

---

## Existing Shared Components
Before creating new components, check these:
| Component | Path | Use for |
|-----------|------|---------|
| `PageHero` | `components/pageHero.tsx` | Full-screen hero with overlay |
| `SectionTitle` | `components/sectionTitle.tsx` | Consistent section headings |
| `FeatureCard` | `components/featureCard.tsx` | Linked cards with icon/description |
| `SolidCard` | `components/solidCard.tsx` | Solid-background card variant |
| `ContentSection` | `components/contentSection.tsx` | Page section wrapper |
| `Container` | `components/container.tsx` | Max-width content container |
| `TextBlock` | `components/textBlock.tsx` | Prose text sections |
| `CallToAction` | `components/callToAction.tsx` | CTA banner |
| `StatsBlock` | `components/statsBlock.tsx` | Numeric stats display |
