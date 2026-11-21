# TutorBooks

A one-person back office for home tutors in India: customers (students/parents), invoices (single or monthly recurring), payments, follow-up reminders sent via WhatsApp, bills, a cash forecast with a late-payment scenario, and alerts.

All sample data is synthetic (fake names and `+91 9xxxxxxxxx` style numbers).

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Type-checks with `tsc --noEmit` (strict) and then produces a static bundle in `dist/`.

## Test

```bash
npm test
```

Runs Vitest on the pure logic in `src/lib/` (invoice status/ageing, forecast, WhatsApp links/reminders).

## Login and data — important limits

- Login is a **local email + password** kept in `localStorage`. This is **not real security**: anyone with access to the browser can read it. Do not use a real password you care about.
- All data (customers, invoices, bills, settings) lives only in `localStorage` in the browser. There is no backend and no sync between devices.
- The sample data (“Load sample data”) is synthetic.

## Deploy as a static site

1. `npm run build`
2. Upload the `dist/` folder to Netlify, Vercel (static), or GitHub Pages.

For Netlify drag-and-drop, drop `dist/`. For Vercel/GitHub Pages, set the build command to `npm run build` and the output directory to `dist`. For GitHub Pages under a sub-path, set `base` in `vite.config.ts`.
