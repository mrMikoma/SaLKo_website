# Varauskalenterin Modernisointi - Vaihe 3 Kehityskohteet

> **Historical (2025).** This describes the 2025 calendar redesign; parts of it no longer match the code. See [BOOKINGS.md](BOOKINGS.md) for how the calendar works now.

**Päivämäärä:** 2025-10-29
**Status:** 📋 Suunnitelma

## Prioriteetti 1: Kriittiset Puutteet

### 🔴 1. Backend API Puutteet
**Ongelma:** Update booking -toiminto puuttuu kokonaan
**Sijainti:** `utilities/bookings.ts`
**Toimenpiteet:**
- [ ] Implementoi `updateBooking()` funktio backend API:ssa
- [ ] Päivitä database schema tukemaan päivityksiä
- [ ] Lisää validointi päivityksille (esim. vain oma varaus voidaan päivittää)
- [ ] Testaa optimistic updates päivitysten kanssa

**Prioriteetti:** 🔴 Kriittinen
**Estimaatti:** 4h

---

### 🔴 2. DatePicker Ongelmat
**Ongelma:** Epäjohdonmukainen state management ja debug-koodi
**Sijainti:** `components/bookings/datePicker.tsx`
**Havaitut ongelmat:**
```typescript
// Rivi 6: Turha import
import { on } from "events";

// Rivi 15: Console.log jäänyt tuotantokoodiin
console.log("DatePicker dateParamDate:", dateParamDate);

// Rivi 70-92: Kommentoitu vanha koodi pitäisi poistaa
```

**Toimenpiteet:**
- [ ] Poista turhat importit (`on` from "events")
- [ ] Poista console.log statements
- [ ] Poista kommentoitu legacy-koodi (rivit 70-92)
- [ ] Refaktoroi käyttämään `useDateFromUrl` hookia suoraan
- [ ] Lisää ARIA-labels ja keyboard navigation
- [ ] Lisää "Tänään" -painike nopeaan palautukseen

**Prioriteetti:** 🔴 Kriittinen
**Estimaatti:** 2h

---

### 🔴 3. BookingModal Modernisointihttp
**Ongelma:** Vanha koodi, ei type-safe, ei validointia
**Sijainti:** `components/bookings/bookingModal.tsx`
**Havaitut ongelmat:**
- Epäjohdonmukainen naming: `updatedbooking` (pieni b)
- Ei React Hook Form -validointia
- Debounce-logiikka liian monimutkainen
- Ei error-viestejä käyttäjälle
- Ei loading-stateja
- Antd Modal dependencies (voisi olla custom)
- Input-kentät eivät ole saavutettavia (missing labels)
- Timezone hardcoded "Europe/Helsinki"

**Toimenpiteet:**
- [ ] Refaktoroi käyttämään React Hook Form + Zod validointia
- [ ] Lisää error-viestit kenttien alle
- [ ] Implementoi loading-state submit-napille
- [ ] Paranna accessibility (proper labels, error announcements)
- [ ] Timezone-käsittely user-settingsistä
- [ ] Lisää confirmation-dialogi poistolle
- [ ] Lisää "duplicate booking" -toiminto
- [ ] Paranna date/time picker UX (esim. quick selects: +1h, +2h, etc.)
- [ ] Lisää plane-valitsin create-modessa
- [ ] Näytä konfliktit reaaliaikaisesti (jos joku muu varaa samaan aikaan)

**Prioriteetti:** 🟠 Tärkeä
**Estimaatti:** 8h

---

## Prioriteetti 2: Käyttökokemus

### 🟠 4. Näkymävaihtoehdot
**Kuvaus:** Lisää eri näkymiä joustavampaan käyttöön
**Toimenpiteet:**
- [ ] **Viikkonäkymä** - Näytä 7 päivää kerralla
- [ ] **Kuukausinäkymä** - Kalenterinäkymä kaikille varauksille
- [ ] **Timeline-näkymä** - Gantt-chart tyylinen aikajana
- [ ] **Lista-näkymä** - Filteroitava ja järjestettävä listaus
- [ ] **Näkymän valitsin** - Toggle-napit eri näkymille
- [ ] URL-parametri näkymän muistamiseen

**Prioriteetti:** 🟠 Tärkeä
**Estimaatti:** 16h

---

### 🟠 5. Suodattimet ja Haku
**Kuvaus:** Paranna datan löydettävyyttä
**Toimenpiteet:**
- [ ] **Tekstihaku** - Hae otsikolla, kuvauksella, käyttäjällä
- [ ] **Lennon tyyppi -filtteri** - Dropdown tai chip-valitsin
- [ ] **Lentokone-filtteri** - Valitse näytettävät koneet
- [ ] **Aikavälihaku** - Custom date range picker
- [ ] **Oma varaukset** -toggle
- [ ] **Tyhjennyspainike** - Clear all filters
- [ ] Filtterit URL-parametreihin (jakaminen)
- [ ] Tallenna suosikki-filtterit

**Prioriteetti:** 🟠 Tärkeä
**Estimaatti:** 12h

---

### 🟠 6. Drag & Drop
**Kuvaus:** Intuitiivinen varausten siirto ja muokkaus
**Teknologia:** `@dnd-kit/core` tai `react-beautiful-dnd`
**Toimenpiteet:**
- [ ] Drag varaus → uusi aika (sama kone)
- [ ] Drag varaus → eri kone
- [ ] Resize varaus vetämällä reunasta
- [ ] Visual feedback dragin aikana
- [ ] Conflict detection (estä päällekkäiset varaukset)
- [ ] Undo/Redo toiminto
- [ ] Touch-tuki mobiilille
- [ ] Optimistic update + backend sync

**Prioriteetti:** 🟡 Hyvä lisä
**Estimaatti:** 20h

---

### 🟠 7. Export-toiminnot
**Kuvaus:** Vie varauksia eri formaateissa
**Toimenpiteet:**
- [ ] **Export PDF** - Tulostettava viikko/kuukausiraportti
- [ ] **Export iCal** - Synkronointi kalenterisovelluksiin
- [ ] **Export CSV/Excel** - Data-analyysi
- [ ] **Export PNG** - Kuvakaappaus (html2canvas)
- [ ] **Share link** - Jakopainike URL:lla (filtterit mukana)
- [ ] **Print-optimoitu layout** - CSS @media print

**Prioriteetti:** 🟡 Hyvä lisä
**Estimaatti:** 10h

---

## Prioriteetti 3: Tekninen Velka

### 🔵 8. Ylimääräiset Komponentit
**Ongelma:** Käyttämättömiä tai vanhoja komponentteja
**Toimenpiteet:**
- [ ] Tarkista onko `bookingCell.tsx` käytössä → Jos ei, poista
- [ ] Tarkista onko `timeline.tsx` käytössä → Modernisoi tai poista
- [ ] Tarkista onko `addBookingForm.tsx` käytössä → Yhdistä modaliin tai poista
- [ ] Dokumentoi mitä komponentteja käytetään missä

**Prioriteetti:** 🔵 Tekninen velka
**Estimaatti:** 2h

---

### 🔵 9. Testit
**Kuvaus:** Laatu-varmistus automaattisilla testeillä
**Toimenpiteet:**

**Unit testit:**
- [ ] `bookingHelpers.ts` - Kaikki 17 funktiota
- [ ] `useBookings` hook - Mock React Query
- [ ] `useDateFromUrl` hook
- [ ] `useBookingModal` hook
- [ ] `useMediaQuery` hook
- [ ] Type guards (`isFlightType`, `isPlane`)

**Component testit:**
- [ ] `BookingsDesktopView` - Rendering, clicks, keyboard
- [ ] `BookingsMobileView` - Rendering, touch
- [ ] `BookingsSkeleton` - Rendering
- [ ] `BookingsError` - Retry functionality
- [ ] `DatePicker` - Navigation, input
- [ ] `BookingModal` - Form validation, submit

**Integration testit:**
- [ ] Booking creation flow
- [ ] Booking update flow
- [ ] Booking deletion flow (with confirmation)
- [ ] Date navigation
- [ ] Mobile/Desktop view switching
- [ ] Optimistic updates + rollback

**E2E testit (Playwright):**
- [ ] Complete booking lifecycle
- [ ] Multi-user conflict scenarios
- [ ] Mobile responsiveness
- [ ] Accessibility tests

**Test framework:** Vitest + React Testing Library + Playwright
**Prioriteetti:** 🔵 Tekninen velka
**Estimaatti:** 24h

---

### 🔵 10. Real-time Updates
**Kuvaus:** WebSocket/SSE varausten reaaliaikaiseen päivittämiseen
**Teknologia:** Socket.io tai Server-Sent Events (SSE)
**Toimenpiteet:**
- [ ] Backend WebSocket/SSE endpoint
- [ ] Client-side WebSocket connection
- [ ] Subscribe to date-specific channels
- [ ] Handle incoming booking events (create/update/delete)
- [ ] Merge incoming data with React Query cache
- [ ] Show toast notification uusista varauksista
- [ ] Conflict resolution (optimistic lock, versioning)
- [ ] Connection state indicator (online/offline)
- [ ] Reconnection logic
- [ ] Fallback polling jos WebSocket ei toimi

**Prioriteetti:** 🔵 Tekninen velka
**Estimaatti:** 16h

---

### 🔵 11. Konfliktien Hallinta
**Kuvaus:** Estä päällekkäiset varaukset
**Toimenpiteet:**
- [ ] **Backend validation** - Tarkista päällekkäisyydet ennen tallennusta
- [ ] **Frontend validation** - Näytä konfliktit reaaliaikaisesti
- [ ] **Visual indicators** - Näytä konflikti punaisella
- [ ] **Confirmation** - Kysy käyttäjältä jos haluaa varataПо занятым aikaan
- [ ] **Locking mechanism** - Optimistic locking varausten päivitykselle
- [ ] **Version conflict** - Käsittele tilanne jos kaksi päivittää samaan aikaan
- [ ] **Audit log** - Tallenna kuka muokkasi ja milloin

**Prioriteetti:** 🔵 Tekninen velka
**Estimaatti:** 12h

---

## Prioriteetti 4: UX Parannukset

### 🟢 12. Animaatiot ja Transitions
**Kuvaus:** Sujuvammat siirtymät ja animaatiot
**Teknologia:** Framer Motion
**Toimenpiteet:**
- [ ] Modal fade-in/out animation
- [ ] Booking cell hover effects (lift, glow)
- [ ] Loading skeleton pulse animation (parempi)
- [ ] Success/Error toast animations
- [ ] Date navigation slide transition
- [ ] Staggered list rendering (mobile view)
- [ ] Smooth scroll to time (jos käyttäjä valitsee tietyn ajan)
- [ ] Spring animations drag & drop:lle

**Prioriteetti:** 🟢 Nice to have
**Estimaatti:** 8h

---

### 🟢 13. Dark Mode
**Kuvaus:** Tumma teema
**Toimenpiteet:**
- [ ] Next-themes integration (jos ei jo ole)
- [ ] Define dark color palette
- [ ] Update all components (Tailwind dark: variants)
- [ ] Update Ant Design theme
- [ ] Smooth theme transition
- [ ] Persist user preference
- [ ] System preference detection
- [ ] Toggle-painike headeriin

**Prioriteetti:** 🟢 Nice to have
**Estimaatti:** 6h

---

### 🟢 14. Tilastot ja Raportit
**Kuvaus:** Näytä aggregoidut tiedot
**Toimenpiteet:**
- [ ] **Dashboard-näkymä:**
  - Varausten määrä per lentokone
  - Varausten määrä per lennon tyyppi
  - Keskimääräinen varauksen pituus
  - Suosituimmat ajat/päivät
  - Käyttäjäkohtaiset tilastot
- [ ] **Charts:** Recharts tai Chart.js
- [ ] **Time range selector:** Viikko/Kuukausi/Vuosi
- [ ] **Export raportteja:** PDF/Excel
- [ ] **Reaaliaikainen päivitys:** WebSocket

**Prioriteetti:** 🟢 Nice to have
**Estimaatti:** 16h

---

### 🟢 15. Notifikaatiot
**Kuvaus:** Muistutukset ja ilmoitukset
**Toimenpiteet:**
- [ ] **Email notifications:**
  - Varauksen vahvistus
  - Muistutus 24h ennen lentoa
  - Muistutus 1h ennen lentoa
  - Varauksen muutos/peruutus
- [ ] **Push notifications** (Progressive Web App)
- [ ] **In-app notifications:**
  - Toast messages (success/error)
  - Badge counts (tulevat varaukset)
  - Notification center
- [ ] **Notification preferences:**
  - User settings milloin lähetetään
  - Email vs Push valinta

**Prioriteetti:** 🟢 Nice to have
**Estimaatti:** 20h

---

### 🟢 16. Varauksen Templates
**Kuvaus:** Toistuville varauksille
**Toimenpiteet:**
- [ ] **Quick templates:**
  - "1h paikallislento"
  - "2h koululento"
  - "3h matkalento"
  - Custom templates
- [ ] **Recurring bookings:**
  - Päivittäin/Viikoittain/Kuukausittain
  - End date valinta
  - Skip holidays
- [ ] **Save as template** -painike
- [ ] **Template management** -sivu
- [ ] **Share templates** muiden käyttäjien kanssa

**Prioriteetti:** 🟢 Nice to have
**Estimaatti:** 12h

---

## Prioriteetti 5: Bundle Optimointi

### ⚪ 17. Date Library Swap
**Ongelma:** Luxon on raskas (11kb minified+gzipped)
**Vaihtoehto:** date-fns (5kb) tai dayjs (2kb)
**Toimenpiteet:**
- [ ] Analysoi kaikki Luxon-käytöt
- [ ] Vertaile date-fns ja dayjs ominaisuuksia
- [ ] Implementoi migration script
- [ ] Replace all Luxon imports
- [ ] Test date formatting ja timezone handling
- [ ] Update documentation
- [ ] Measure bundle size difference

**Säästö:** ~6-9kb
**Prioriteetti:** ⚪ Optimointi
**Estimaatti:** 8h

---

### ⚪ 18. Code Splitting Parannus
**Kuvaus:** Aggressive code splitting
**Toimenpiteet:**
- [ ] Lazy load BookingsDesktopView
- [ ] Lazy load BookingsMobileView
- [ ] Lazy load DatePicker (jos ei näy heti)
- [ ] Route-based splitting
- [ ] Component-based splitting
- [ ] Bundle analyzer raportti
- [ ] Lighthouse audit

**Prioriteetti:** ⚪ Optimointi
**Estimaatti:** 4h

---

## Yhteenveto Prioriteeteilla

### 🔴 Kriittinen (0-2 viikkoa):
1. Backend API Puutteet (4h)
2. DatePicker Ongelmat (2h)
3. BookingModal Modernisointi (8h)
**Yhteensä:** 14h (1.75 työpäivää)

### 🟠 Tärkeä (2-6 viikkoa):
4. Näkymävaihtoehdot (16h)
5. Suodattimet ja Haku (12h)
6. Drag & Drop (20h)
7. Export-toiminnot (10h)
**Yhteensä:** 58h (7.25 työpäivää)

### 🔵 Tekninen velka (6-12 viikkoa):
8. Ylimääräiset Komponentit (2h)
9. Testit (24h)
10. Real-time Updates (16h)
11. Konfliktien Hallinta (12h)
**Yhteensä:** 54h (6.75 työpäivää)

### 🟢 Nice to have (12+ viikkoa):
12. Animaatiot ja Transitions (8h)
13. Dark Mode (6h)
14. Tilastot ja Raportit (16h)
15. Notifikaatiot (20h)
16. Varauksen Templates (12h)
**Yhteensä:** 62h (7.75 työpäivää)

### ⚪ Optimointi (milloin aikaa):
17. Date Library Swap (8h)
18. Code Splitting Parannus (4h)
**Yhteensä:** 12h (1.5 työpäivää)

---

## 📊 Kokonaistyömäärä
**Total:** 200h (25 työpäivää ~1.25 kuukautta)

## 🎯 Suositeltu Toteutusjärjestys

### Sprint 1 (2 viikkoa):
- Backend API (updateBooking)
- DatePicker refaktorointi
- BookingModal modernisointi

### Sprint 2 (2 viikkoa):
- Viikkonäkymä
- Suodattimet ja haku
- Dark mode (bonus)

### Sprint 3 (2 viikkoa):
- Testit (unit + component)
- Ylimääräisten komponenttien cleanup
- Code splitting parannus

### Sprint 4 (2 viikkoa):
- Real-time updates
- Konfliktien hallinta
- Export-toiminnot

### Sprint 5+ (jatkuva):
- Drag & Drop
- Tilastot
- Notifikaatiot
- Templates
- Animaatiot

---

## 🔗 Liittyvät Dokumentit
- [BOOKING_MODERNIZATION.md](./BOOKING_MODERNIZATION.md) - Vaihe 1 toteutus
- [BOOKING_PHASE2_IMPROVEMENTS.md](./BOOKING_PHASE2_IMPROVEMENTS.md) - Vaihe 2 toteutus
- [../types/bookings.ts](../types/bookings.ts) - Type definitions
- [../utils/bookingHelpers.ts](../utils/bookingHelpers.ts) - Helper functions
