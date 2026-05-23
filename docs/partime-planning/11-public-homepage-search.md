# Public Homepage and Marketplace Search

## Scope

Partime's public root page is now the marketplace entry point. It is designed mobile-first and search-first, with a light blue visual system, compact BM/ID/EN language selector, employer CTA, live marketplace statistics, popular search chips, and image-led featured job cards.

## Public Search Contract

The homepage search form routes directly to `/jobs` with these query parameters:

- `location`: free-text city, venue, or address search.
- `skill`: accepts either a skill slug from the filter UI or free-text skill names such as `Event Crew`, `Promoter`, `Wiring`, or `Aircond`.
- `date`: HTML date input, interpreted against Malaysia time boundaries.

The `/jobs` page also supports:

- `q`: broad text search across title, work type, location, city, and state.
- `stateCode`: canonical Malaysia state code filter used by the dependent dropdown.
- `state`: canonical Malaysia state name for readable URLs and fallback filtering.
- `city`: city filter from the dependent dropdown.
- `category`: public job category.
- `payType`: `HOURLY`, `DAILY`, or `FIXED`.
- `minRate`: minimum RM rate.
- `openOnly`: restricts to jobs with `OPEN` status.

## Malaysia location UX

- `/jobs` keeps the free-text `location` field for venue/address keywords.
- `/jobs` also provides dependent state and city controls backed by `/api/public/locations/*`.
- Employer job posting uses the same location master data and stores `stateCode`, `state`, `city`, `postcode`, `address`, and `addressLine2` on `WorkEvent`.

## Homepage Metrics

The homepage reads live database counts:

- Active Jobs: public active jobs in `OPEN` or `OFFERING` state.
- Registered Part-timers: `Staff` records in active or pending-review state.
- Verified Employers: active tenants.
- Average Response Rate: replied offer recipients divided by all offer recipients.

If no offers exist yet, the response rate is displayed as `0%` rather than hidden behind fallback copy.

## Media Rules

Marketplace cards prefer real uploaded media in this order:

1. `WorkEvent.coverImageUrl`
2. first image in `JobMedia`
3. curated public fallback imagery for an empty fresh database

Employer job creation supports an optional cover image and gallery media. Public job details display the cover, gallery, required skills, workers needed, pay type, dress code, tools needed, address, related jobs, and the WhatsApp interest form.

## Registration Media

Public employer registration accepts an optional company logo and stores it on `Tenant.logoUrl/logoKey` after OTP verification. Public part-timer registration accepts optional portfolio images/videos and stores them in `PartTimerPortfolioMedia` after profile creation.

## Migration Notes

The homepage refinement migration adds these nullable fields to `WorkEvent`:

- `dressCode`
- `toolsNeeded`
- `paidAt`
- `paidBy`
- `paymentReference`

The payment fields are placeholders for future reconciliation only. No live payment gateway is integrated.
