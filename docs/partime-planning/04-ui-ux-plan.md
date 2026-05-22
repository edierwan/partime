# 04 — UI / UX Plan

Visual reference: the attached mockup screenshots. Match the look closely.

## Design tokens
- Background: `#F6F8FB` (light blue-grey).
- Cards: white, rounded-2xl, soft shadow (`shadow-sm` + custom).
- Primary: indigo / navy `#2540D8` (buttons, links).
- Success: emerald `#10B981` (OPEN / COMPLETED / ACTIVE badges).
- Warning: amber `#F59E0B` (manual adjusted / missing bank).
- Danger: rose `#EF4444` (missing clock-out / deactivate).
- Text: zinc-900 / zinc-500 for secondary.
- Font: system / `Inter`.
- Radius: 12–16px on cards, 8px on inputs/buttons.

## Layout
- **Admin shell**: left sidebar (logo + nav), top bar (search, date picker
  display, notifications, admin menu), main content area.
- Sidebar items: Dashboard, Staff, Events & QR, Attendance Logs, Reports
  (Daily, Weekly Payroll, Exceptions), Settings. Footer: company picker.
- Active nav item: light indigo pill, indigo text.
- Slide-over panels (right side) for create/edit forms (staff, event, adjust
  attendance). Click outside or X to close.

## Components
- `StatCard` — icon chip + label + big number + delta hint.
- `Badge` — colored pill (OPEN, COMPLETED, MISSING CLOCK OUT, MANUAL
  ADJUSTED, CANCELLED, ACTIVE, INACTIVE, MISSING BANK INFO).
- `DataTable` — header row in zinc-50, dividers, hover.
- `SlideOver` — fixed right panel with header + scrollable body + sticky
  footer (Cancel / Save).
- `EmptyState` and `Loader` components.
- `PrintShell` — print-only layout (no nav, no shadow).

## Public scan page
- Full-width mobile container, padded.
- Event card with calendar icon + name + location + date + hourly rate.
- Step 1: phone/alias input with **Find Me** button.
- Step 2: staff found card (avatar + name + staff ID + current status).
- Step 3: big primary button (Clock In / Clock Out).
- Step 4: success card with all calculated values.
- Footer note: "Break is auto-deducted based on company policy."

## Tables
- Sticky header on long tables.
- Right-aligned currency.
- Truncated long names with tooltip.
- Mobile: collapse to card list with key fields stacked.

## Reports
- Print layout uses `@media print` to hide sidebar/topbar.
- CSV export via server route returning `text/csv`.
