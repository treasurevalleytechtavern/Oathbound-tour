# Oathbound Tour Site

Static tour site for `tour.oathboundband.com`.

## Pages

- `/` shows current and future dates.
- `/past-shows/` shows dates before today.

Both pages use the same CSS, JavaScript, background video, logo, and show card template. The only difference is the `data-page` value on the `<body>`, which controls filtering.

## Updating Shows With CSV

Use `data/shows-template.csv` as the spreadsheet template. Keep the header row:

```csv
date,doorsTime,showTime,venue,address,city,region,country,lineup,ageRestriction,ticketUrl,ticketLabel,infoUrl,infoLabel,notes
```

Required field:

- `date`

Use `YYYY-MM-DD` for dates when possible. The uploader also accepts spreadsheet-style `M/D/YYYY` dates and converts them to `YYYY-MM-DD`. Empty optional fields are allowed.

Open `/admin/`, upload the CSV export, then download the generated `shows.json`. Replace `data/shows.json` with that downloaded file before deploying.

Directions buttons are generated automatically from `address` when present. If `address` is blank, the site uses venue plus city and region when enough location data exists.

The generated JSON uses this shape:

```json
{
  "date": "2026-06-14",
  "doorsTime": "6:30 PM",
  "showTime": "7:30 PM",
  "venue": "The Loading Dock",
  "address": "",
  "city": "Salt Lake City",
  "region": "UT",
  "country": "USA",
  "lineup": "Summer run",
  "ageRestriction": "21+",
  "ticketUrl": "https://example.com",
  "ticketLabel": "Tickets",
  "infoUrl": "https://example.com",
  "infoLabel": "Details",
  "notes": ""
}
```

## Tour Campaign Treatment

Temporary tour names, page copy, active theme, and tour accent colors are controlled by `data/tour-campaigns.json`.

The site reads this file on the upcoming shows page before rendering show cards. The active campaign is the first enabled campaign whose date window contains the current date.

Use this shape:

```json
{
  "id": "dark-origins-2026",
  "enabled": true,
  "name": "Dark Origins Tour",
  "theme": "dark-origins",
  "startsAt": "2026-07-12",
  "endsAt": "2026-09-21",
  "accent": "#b3222d",
  "accentText": "#ffffff",
  "accent2": "#f1d7a1",
  "glow": "rgba(179, 34, 45, 0.34)",
  "eyebrow": "Dark Origins Tour",
  "pageTitle": "Dark Origins Tour Dates",
  "pageSubtitle": "Oathbound on the road",
  "pageCopy": "Find the next Dark Origins Tour stop, grab tickets, and help bring the room to life.",
  "showsHeading": "Tour Dates",
  "headerTitle": "Oathbound // Dark Origins Tour",
  "documentTitle": "Oathbound - Dark Origins Tour"
}
```

The `theme` value becomes `data-tour-theme` on the `<html>` element. The `accent`, `accent2`, and `glow` values become CSS variables used by buttons, active show highlights, target cards, and page headings. If `accentText` is omitted, the site automatically chooses black or white text based on which has better contrast against `accent`.

### TVTT Show Manager Export Notes

When TVTT Show Manager exports tour dates, it should continue exporting `data/shows.json` as the array of show records. It should also create or update `data/tour-campaigns.json` for tour-level presentation.

Show-level JSON should keep using stable location and asset keys:

- `regionSlug` should be a state abbreviation slug such as `ca`, `or`, `wa`, `nv`, or `az`.
- `assetsKey` should usually be `${regionSlug}/${citySlug}`.
- Do not mix values like `ca` and `california` for the same state.

Campaign-level JSON should contain the temporary tour treatment:

- `enabled`: `true` for the current campaign and `false` for old campaigns.
- `startsAt`: first date the treatment should appear, as `YYYY-MM-DD`.
- `endsAt`: last date the treatment should appear, usually the day after the final show or a chosen cleanup date.
- `theme`: stable slug for optional CSS treatment.
- `accent`, `accent2`, `glow`: colors sampled from the tour artwork.
- `accentText`: optional. Omit this by default so the site can automatically choose black or white text for accessibility.
- `eyebrow`, `pageTitle`, `pageSubtitle`, `pageCopy`, `showsHeading`, `headerTitle`, `documentTitle`: copy used on the upcoming shows page.

When a tour ends, TVTT Show Manager should either set that campaign's `enabled` value to `false` or move the date window into the past. New tour artwork should update the campaign colors at the same time as the new tour poster/flyer assets.

## Deployment

Upload the full folder contents to the static host for `tour.oathboundband.com`. Keep `past-shows/index.html`, `data/shows.json`, and the `assets` folder in place.

## Street Team Asset URLs

When exporting street team assets from the show manager, local asset paths must be root-relative site paths:

- Use `/street-team/kits/or/eugene/6-18-eugene-flyer.JPG`
- Do not use `street-team/kits/or/eugene/6-18-eugene-flyer.JPG`
- Match the exact filename casing from disk, including extensions like `.JPG`, `.JPEG`, `.PNG`, or `.jpg`

This matters because the street team page lives at `/street-team/`. A page-relative asset URL like `street-team/kits/...` resolves in the browser as `/street-team/street-team/kits/...`, which breaks the image on the live site.

Before deploying updated street team assets, run:

```sh
node scripts/validate-street-team-asset-urls.js
```

The validator checks `data/street-team-assets.json` and `street-team/street-team-downloads.json` for page-relative street team paths and local file casing mismatches.
