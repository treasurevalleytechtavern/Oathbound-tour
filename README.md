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

## Deployment

Upload the full folder contents to the static host for `tour.oathboundband.com`. Keep `past-shows/index.html`, `data/shows.json`, and the `assets` folder in place.
