const STREET_TEAM_SIGNUP_URL = "https://oathboundband.com/street-team-signup";
const rootPath = document.body.dataset.root || "..";
const siteRoot = getSiteRoot();
const stateIconRoot = `${siteRoot}/assets/icons/states/Prismatic (300 x 300 px)`;
const stateSelector = document.querySelector("#state-selector");
const showsContainer = document.querySelector("#street-team-shows");
const showCount = document.querySelector("#street-team-show-count");
const BUTTON_ICONS = {
  download: `${siteRoot}/assets/icons/buttons/300x169/download-button-prismatic-300x169.png`,
  join: `${siteRoot}/assets/icons/buttons/300x169/sign-up-button-prismatic-300x169.png`,
  area: `${siteRoot}/assets/icons/buttons/300x169/pick-your-area-button-prismatic-300x169.png`,
  tickets: `${siteRoot}/assets/icons/buttons/300x169/tickets-button-prismatic-300x169.png`,
};
const ROUTING_FLYER_ASSET_ID = "street-team-general-oathbound-x-pretty-suspect-routing-flyer";
const CAPTION_TEMPLATES = [
  `[City], Oathbound is coming through.

[Venue]
[Date] at [Time]

[Lineup]
[TicketInfo]

Bring a friend and come early for the whole bill.

[BandTags]

#Oathbound #PrettySuspect #MyspaceTour #LiveMusic #Metalcore #PostHardcore #[CityHashtag]`,
  `Heavy music friends in [City], this one is for you.

[Date] at [Venue].
Music starts at [Time].
[AgeRestriction]

Come hang, support the locals, and help make the room feel alive.

[Lineup]
[TicketInfo]

[BandTags]

#Oathbound #MyspaceTour #LiveMusic #LocalShows #HeavyMusic #Hardcore #[CityHashtag]`,
  `[City] show reminder.

Oathbound and friends are at [Venue] on [Date].
If you know someone who would be into this, send it their way.

Time: [Time]
Lineup: [Lineup]
[TicketInfo]

[BandTags]

#Oathbound #PrettySuspect #StreetTeam #MyspaceTour #LiveMusic #SupportLocalMusic #[CityHashtag]`,
  `[City] friends, don't miss this one.

Oathbound plays [Venue] on [Date].
Show time is [Time].
[TicketInfo]

Come out, bring someone with you, and stay for the whole lineup.

[Lineup]

[BandTags]

#Oathbound #MyspaceTour #MetalShow #HardcoreShow #LiveMusic #SceneSupport #[CityHashtag]`,
  `Put this one on your calendar.

Oathbound at [Venue]
[City]
[Date]
[Time]

Save it, share it, and bring a friend who needs a loud night out.

[Lineup]
[TicketInfo]

[BandTags]

#Oathbound #PrettySuspect #LiveMusic #Metalcore #PostHardcore #LocalMusic #[CityHashtag]`,
  `[City], come make some noise.

Oathbound brings the Myspace Tour to [Venue] on [Date].
Show time: [Time]

[Lineup]
[TicketInfo]

Share this with someone who loves loud bands in small rooms.

[BandTags]

#Oathbound #MyspaceTour #LiveShows #Metalcore #Hardcore #PunkShows #[CityHashtag]`,
  `Here is your friendly go-to-the-show nudge.

[City]
[Venue]
[Date]
[Time]

Oathbound is coming through with:
[Lineup]

[TicketInfo]

Screenshot it, send it to the group chat, and come hang.

[BandTags]

#Oathbound #PrettySuspect #LiveMusic #StreetTeam #HeavyShows #LocalScene #[CityHashtag]`,
  `The flyer helps, but people in the room matter more.

Oathbound plays [Venue] in [City] on [Date].
Music starts at [Time].

[Lineup]
[TicketInfo]
[AgeRestriction]

Help spread the word and bring the people who would love this.

[BandTags]

#Oathbound #MyspaceTour #Metalcore #HardcoreMusic #SupportTheScene #LocalShows #[CityHashtag]`,
  `[City] show alert.

Oathbound at [Venue]
[Date] at [Time]

If you like loud guitars and shows that feel better in person, come through.

[Lineup]
[TicketInfo]

[BandTags]

#Oathbound #PrettySuspect #LiveMusic #MetalShow #HardcoreShow #SceneKidsNeverDie #[CityHashtag]`,
  `Help pack the room for Oathbound in [City].

Where: [Venue]
When: [Date]
Time: [Time]
Lineup: [Lineup]

[TicketInfo]

Post it, share it, and text the friend who always says "I didn't know about it."

[BandTags]

#Oathbound #MyspaceTour #StreetTeam #LiveMusic #Metalcore #PostHardcore #SupportLocalMusic #[CityHashtag]`,
];

let streetTeamState = {
  shows: [],
  downloads: { general: [], cities: {}, shows: {} },
  streetAssets: [],
  selectedRegion: "",
};

loadStreetTeamPage();
wireTracking();
wireArtworkModal();

async function loadStreetTeamPage() {
  const [showsResult, downloadsResult, streetAssetsResult] = await Promise.allSettled([
    fetchJson(`${siteRoot}/data/shows.json`),
    fetchJson(`${siteRoot}/street-team/street-team-downloads.json`),
    fetchJson(`${siteRoot}/data/street-team-assets.json`),
  ]);

  if (downloadsResult.status === "fulfilled") {
    streetTeamState.downloads = normalizeDownloads(downloadsResult.value);
  }

  if (streetAssetsResult.status === "fulfilled") {
    streetTeamState.streetAssets = Array.isArray(streetAssetsResult.value) ? streetAssetsResult.value.map(normalizeStreetAsset) : [];
    mergeStreetAssetsIntoDownloads(streetTeamState.streetAssets);
  }

  if (showsResult.status !== "fulfilled") {
    renderSafeMessage("Upcoming show details are being updated. Check back soon or join the street team below.", true);
    console.error(showsResult.reason);
    return;
  }

  streetTeamState.shows = showsResult.value
    .map(normalizeShow)
    .filter(isUpcomingPublicShow)
    .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

  if (!streetTeamState.shows.length) {
    stateSelector.hidden = true;
    renderSafeMessage("No active street team pushes right now, but join below and tell us where you are. We'll reach out when Oathbound is headed near your area.");
    if (showCount) {
      showCount.textContent = "No active pushes";
    }
    return;
  }

  const regions = getRegions(streetTeamState.shows);
  streetTeamState.selectedRegion = streetTeamState.shows[0]?.regionSlug || regions[0]?.slug || "";
  renderStateSelector(regions);
  renderShowsForState();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }

  return response.json();
}

function normalizeDownloads(downloads) {
  return {
    general: Array.isArray(downloads.general) ? downloads.general : [],
    cities: downloads.cities || {},
    shows: downloads.shows || {},
  };
}

function normalizeStreetAsset(asset) {
  const includeInDownloads = asset.includeInStreetTeamDownloads === true || Boolean(String(asset.downloadUrl || "").trim());
  const downloadUrl = normalizeAssetUrl(asset.downloadUrl || asset.fileUrl || asset.url || "");
  const assetUrl = normalizeAssetUrl(asset.fileUrl || asset.url || asset.downloadUrl || "");
  const previewUrl = normalizeAssetUrl(asset.previewUrl || asset.thumbUrl || asset.preview || asset.fileUrl || "");

  return {
    assetId: String(asset.assetId || "").trim(),
    showId: String(asset.showId || "").trim(),
    kitKey: String(asset.assetsKey || asset.kitKey || "").trim(),
    assetType: String(asset.assetType || "material").trim(),
    title: String(asset.downloadTitle || asset.assetTitle || asset.title || "Street Team Material").trim(),
    url: includeInDownloads ? downloadUrl : assetUrl,
    preview: previewUrl,
    fileName: String(asset.fileName || "").trim(),
    altText: String(asset.altText || asset.assetTitle || "Street team material").trim(),
    platform: String(asset.platform || "all").trim(),
    downloadScope: String(asset.downloadScope || "").trim(),
    downloadType: String(asset.downloadType || "").trim(),
    includeInDownloads,
    status: String(asset.status || "").trim(),
    usage: String(asset.usage || "").trim(),
    notes: String(asset.notes || "").trim(),
    lastUpdated: String(asset.lastUpdated || "").trim(),
  };
}

function mergeStreetAssetsIntoDownloads(assets) {
  assets
    .filter((asset) => asset.includeInDownloads && asset.url && !/draft|hidden|archived/i.test(asset.status))
    .forEach((asset) => {
      const download = {
        title: asset.title,
        type: asset.downloadType || toTitleCase(asset.assetType),
        url: asset.url,
        preview: asset.preview,
        fileType: getFileType(asset.url),
        alt: asset.altText,
        platform: asset.platform,
        usage: asset.usage,
        notes: asset.notes,
        status: asset.status,
        lastUpdated: asset.lastUpdated,
      };

      if (asset.downloadScope === "general" || (!asset.showId && !asset.kitKey)) {
        const generalDownloads = streetTeamState.downloads.general || [];
        if (!generalDownloads.some((item) => item.url === download.url)) {
          generalDownloads.push(download);
        }
        streetTeamState.downloads.general = generalDownloads;
      }

      if (asset.showId) {
        const showDownloads = streetTeamState.downloads.shows[asset.showId] || [];
        if (!showDownloads.some((item) => item.url === download.url)) {
          showDownloads.push(download);
        }
        streetTeamState.downloads.shows[asset.showId] = showDownloads;
      }

      if (asset.kitKey) {
        const cityDownloads = streetTeamState.downloads.cities[asset.kitKey] || [];
        if (!cityDownloads.some((item) => item.url === download.url)) {
          cityDownloads.push(download);
        }
        streetTeamState.downloads.cities[asset.kitKey] = cityDownloads;
      }
    });
}

function normalizeShow(rawShow) {
  let city = String(rawShow.city || "").trim();
  let region = String(rawShow.region || "").trim().toUpperCase();

  if (!region && city.includes(",")) {
    const parts = city.split(",");
    city = parts.shift().trim();
    region = parts.join(",").trim().toUpperCase();
  }

  const country = normalizeCountry(rawShow.country);
  const citySlug = rawShow.citySlug || slugify(city);
  const regionSlug = rawShow.regionSlug || slugify(region);
  const kitKey = rawShow.kitKey || rawShow.assetsKey || `${regionSlug}/${citySlug}`;
  const market = String(rawShow.market || rawShow.area || `${city} Area`).trim();

  return {
    ...rawShow,
    id: rawShow.id || [rawShow.date, city, region].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    date: String(rawShow.date || "").trim(),
    doorsTime: String(rawShow.doorsTime || "").trim(),
    showTime: String(rawShow.showTime || rawShow.time || "").trim(),
    venue: String(rawShow.venue || "").trim(),
    address: String(rawShow.address || "").trim(),
    city,
    region,
    regionName: rawShow.regionName || getRegionName(region),
    country,
    lineup: normalizeLineup(rawShow.lineup),
    status: String(rawShow.status || rawShow.confirmationStatus || "").trim(),
    ageRestriction: normalizeAgeRestriction(rawShow.ageRestriction),
    ticketUrl: String(rawShow.ticketUrl || "").trim(),
    ticketLabel: String(rawShow.ticketLabel || "").trim(),
    doorSalesOnly: rawShow.doorSalesOnly === true,
    ticketStatus: String(rawShow.ticketStatus || "").trim(),
    ticketDisplayLabel: String(rawShow.ticketDisplayLabel || "").trim(),
    infoUrl: String(rawShow.infoUrl || "").trim(),
    infoLabel: String(rawShow.infoLabel || "").trim(),
    notes: String(rawShow.notes || "").trim(),
    market,
    citySlug,
    regionSlug,
    kitPath: rawShow.kitPath || rawShow.assetsPath || `/street-team/kits/${regionSlug}/${citySlug}/`,
    kitKey,
    displayMode: String(rawShow.displayMode || "full").trim(),
  };
}

function isUpcomingPublicShow(show) {
  if (!show.date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parseLocalDate(show.date) < today) {
    return false;
  }

  if (show.public === false || show.streetTeam === false) {
    return false;
  }

  const status = show.status.toLowerCase();
  const isSoftStatus = /pending|tentative|planning|private|hidden/.test(status);

  if (isSoftStatus && show.public !== true) {
    return false;
  }

  return true;
}

function getRegions(shows) {
  const regions = new Map();

  shows.forEach((show) => {
    if (!regions.has(show.regionSlug)) {
      regions.set(show.regionSlug, {
        slug: show.regionSlug,
        label: show.regionName || show.region || "Area",
        abbreviation: show.region,
        count: 0,
      });
    }

    regions.get(show.regionSlug).count += 1;
  });

  return Array.from(regions.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function renderStateSelector(regions) {
  stateSelector.innerHTML = "";
  stateSelector.classList.toggle("state-selector--compact", regions.length > 5);

  regions.forEach((region) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "state-button";
    button.dataset.region = region.slug;
    button.dataset.track = "street-team-state-select";
    button.dataset.state = region.slug;
    button.setAttribute("aria-pressed", region.slug === streetTeamState.selectedRegion ? "true" : "false");
    button.setAttribute("aria-label", `${region.label}, ${region.count} ${region.count === 1 ? "show" : "shows"}`);
    button.innerHTML = `
      <img src="${getStateIconPath(region)}" alt="${escapeHtml(region.label)}" loading="eager">
      <small>${region.count} ${region.count === 1 ? "show" : "shows"}</small>
    `;
    wireImageFallback(button.querySelector("img"));
    button.addEventListener("click", () => {
      streetTeamState.selectedRegion = region.slug;
      renderStateSelector(regions);
      renderShowsForState();
      document.querySelector("#street-team-shows")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    stateSelector.appendChild(button);
  });

  stateSelector.appendChild(createUnlistedStateButton());
}

function getStateIconPath(region) {
  const stateName = slugify(region.label || region.abbreviation || "");
  return `${stateIconRoot}/${stateName}-prismatic-v2.png`;
}

function createUnlistedStateButton() {
  const link = document.createElement("a");
  link.className = "state-button state-button--link";
  link.href = "#my-state-is-not-listed";
  link.dataset.track = "street-team-state-select";
  link.dataset.state = "not-listed";
  link.setAttribute("aria-label", "My state is not listed");

  const image = document.createElement("img");
  image.src = `${stateIconRoot}/my-state-isnt-listed-prismatic-v2.png`;
  image.alt = "My state is not listed";
  image.loading = "eager";

  const label = document.createElement("small");
  label.textContent = "My state isn't listed";

  link.append(image, label);
  wireImageFallback(image);
  return link;
}

function renderShowsForState() {
  const shows = streetTeamState.shows.filter((show) => show.regionSlug === streetTeamState.selectedRegion);
  const selectedRegion = getRegions(streetTeamState.shows).find((region) => region.slug === streetTeamState.selectedRegion);
  const markets = groupBy(shows, (show) => show.market || `${show.city} Area`);
  const fragment = document.createDocumentFragment();

  showsContainer.innerHTML = "";

  if (showCount) {
    showCount.textContent = `${shows.length} upcoming ${shows.length === 1 ? "show" : "shows"}${selectedRegion ? ` in ${selectedRegion.label}` : ""}`;
  }

  const marketEntries = Array.from(markets.entries());
  const shouldAutoExpandSingleShow = shows.length === 1;

  marketEntries.forEach(([market, marketShows]) => {
    fragment.appendChild(createAreaCard(market, marketShows, shouldAutoExpandSingleShow));
  });

  showsContainer.appendChild(fragment);
}

function createAreaCard(market, marketShows, isOpen) {
  const section = document.createElement("section");
  const marketSlug = slugify(market);
  const areaDownloadsCount = getAreaDownloads(marketShows).length;

  section.className = "market-section";
  section.dataset.track = "street-team-market-select";
  section.dataset.market = market;
  section.setAttribute("aria-labelledby", `market-${marketSlug}`);

  const heading = document.createElement("div");
  heading.className = "market-heading market-heading--action";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "market-toggle";
  button.id = `market-${marketSlug}`;
  button.setAttribute("aria-expanded", isOpen ? "true" : "false");
  button.setAttribute("aria-controls", `market-panel-${marketSlug}`);
  button.innerHTML = `
    <span>
      <strong>${escapeHtml(market)}</strong>
      <small>${marketShows.length} upcoming ${marketShows.length === 1 ? "show" : "shows"} / ${areaDownloadsCount} ${areaDownloadsCount === 1 ? "file" : "files"}</small>
    </span>
    <span class="market-toggle__cue" aria-hidden="true">${isOpen ? "-" : "+"}</span>
  `;

  const panel = document.createElement("div");
  panel.id = `market-panel-${marketSlug}`;
  panel.className = "market-panel";
  panel.hidden = !isOpen;

  const actionRow = document.createElement("div");
  actionRow.className = "area-actions";
  actionRow.appendChild(createImageTrackedLink(STREET_TEAM_SIGNUP_URL, "Join Street Team", BUTTON_ICONS.join, {
    track: "street-team-join",
    state: marketShows[0]?.regionSlug || "",
    market,
    trackDestination: "godaddy-form",
  }, "prismatic-button prismatic-button--join"));

  panel.appendChild(actionRow);

  const showList = document.createElement("div");
  showList.className = "area-show-list";
  marketShows.forEach((show) => showList.appendChild(createCompactShowRow(show)));
  panel.appendChild(showList);

  button.addEventListener("click", () => {
    const shouldOpen = panel.hidden;
    panel.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    button.querySelector(".market-toggle__cue").textContent = shouldOpen ? "-" : "+";
  });

  heading.appendChild(button);
  section.append(heading, panel);
  return section;
}

function createCompactShowRow(show) {
  const card = document.createElement("article");
  const normalizedStatus = normalizeShowStatus(show.status);
  const isCancelled = normalizedStatus?.key === "cancelled";
  const isAreaOnly = show.displayMode === "area-only";
  const location = [show.city, show.region].filter(Boolean).join(", ");
  const downloads = getShowResourceDownloads(show);
  const socialAssets = getShowSocialAssets(show);
  const flyerState = getShowFlyerState(show);

  card.className = isCancelled ? "street-show-card street-show-card--compact street-show-card--cancelled" : "street-show-card street-show-card--compact";
  card.dataset.track = "street-team-view-show";
  card.dataset.showId = show.id;
  card.dataset.state = show.regionSlug;
  card.dataset.city = show.citySlug;

  const statusChip = normalizedStatus ? `<span class="status-chip status-chip--${escapeHtml(normalizedStatus.key)}">${escapeHtml(normalizedStatus.label)}</span>` : "";
  const venue = isAreaOnly ? "Area details TBA" : escapeHtml(show.venue || "Venue TBA");
  const dateLine = isAreaOnly ? "Details TBA" : escapeHtml(formatLongDate(parseLocalDate(show.date)));
  const timeLine = isAreaOnly ? "" : formatTimes(show);

  card.innerHTML = `
    <div class="street-show-card__main">
      <div class="street-show-card__date">
        <span>${escapeHtml(formatMonth(parseLocalDate(show.date)))}</span>
        <strong>${escapeHtml(formatDay(parseLocalDate(show.date)))}</strong>
      </div>
      <div class="street-show-card__body">
        <div class="show-flags">${statusChip}</div>
        <h4>${escapeHtml(location)}</h4>
        <p class="show-location">${venue}</p>
        <p class="show-time">${dateLine}${timeLine ? ` / ${escapeHtml(timeLine)}` : ""}</p>
      </div>
      <div class="street-show-card__meta">${getShowBadges(show).map((badge) => renderShowBadge(badge, show)).join("")}</div>
    </div>
  `;

  if (!isCancelled) {
    card.appendChild(createShowResourceSection(show, downloads, socialAssets, flyerState));
  }

  return card;
}

function createShowResourceSection(show, downloads, socialAssets, flyerState = getShowFlyerState(show)) {
  const section = document.createElement("div");
  section.className = "street-show-resources";
  const displayDownloads = getDisplayDownloads(downloads, flyerState);

  if (flyerState.notice) {
    const notice = document.createElement("p");
    notice.className = "street-team-note street-team-note--inline";
    notice.textContent = flyerState.notice;
    section.appendChild(notice);
  }

  if (displayDownloads.length) {
    const downloadsRow = document.createElement("div");
    downloadsRow.className = "show-downloads";

    const title = document.createElement("h5");
    title.textContent = flyerState.kind === "routing" ? "Tour routing flyer" : "Show flyer";

    const downloadsGrid = document.createElement("div");
    downloadsGrid.className = "download-grid download-grid--tiny";
    displayDownloads.forEach((download) => downloadsGrid.appendChild(createDownloadCard(download, show)));

    downloadsRow.append(title, downloadsGrid);
    section.appendChild(downloadsRow);
  }

  section.appendChild(createCaptionGenerator(show, flyerState));

  const grid = document.createElement("div");
  grid.className = "street-action-grid";
  grid.setAttribute("aria-label", "Street team resources for this show");

  if (displayDownloads.length) {
    grid.appendChild(createStreetActionItem({
      key: "in-person",
      label: flyerState.kind === "routing" ? "Routing flyer" : "Flyer run",
      text: flyerState.kind === "routing"
        ? "Use the routing flyer until the city flyer lands, and pair it with the show details below."
        : "Print or post this flyer where it is allowed: venues, record stores, coffee shops, rehearsal spaces, and campus boards.",
    }));
  } else {
    grid.appendChild(createStreetActionItem({
      key: "social-fallback",
      label: "No flyer yet",
      text: `Help ${show.city} wake up anyway: repost the band's show posts, drop the date in local heavy music spaces, and tag friends who would actually show up.`,
    }));
  }

  if (socialAssets.length) {
    socialAssets.forEach((asset) => grid.appendChild(createSocialAssetItem(asset, show)));
  } else {
    grid.appendChild(createStreetActionItem({
      key: "social",
      label: "Social push",
      text: `Share the show with people near ${show.city}, tag Oathbound, and make it easy for heavy music fans to find the room.`,
    }));
  }

  const primaryUrl = show.ticketUrl || show.infoUrl;
  if (primaryUrl) {
    grid.appendChild(createLinkedActionItem({
      key: "tickets",
      label: "Ticket link",
      text: "Share the ticket link with friends who might be interested, make a plan together, and give people an easy next step before the night slips by.",
      href: primaryUrl,
      track: show.ticketUrl ? "street-team-ticket" : "street-team-details",
      show,
      linkLabel: show.ticketUrl ? show.ticketLabel || "Tickets" : show.infoLabel || "Details",
      buttonIcon: BUTTON_ICONS.tickets,
      buttonClass: "prismatic-button prismatic-button--ticket",
    }));
  }

  section.appendChild(grid);
  return section;
}

function createSocialAssetItem(asset, show) {
  return createLinkedActionItem({
    key: "social",
    label: asset.title || `${toTitleCase(asset.platform)} post`,
    text: asset.notes || asset.usage || "Share, repost, or tag friends from this post when it fits your area.",
    href: asset.url,
    track: "street-team-social",
    show,
    destination: asset.platform,
    linkLabel: asset.platform ? `Open ${toTitleCase(asset.platform)}` : "Open post",
  });
}

function createLinkedActionItem({ key, icon, label, text, href, track, show, destination = "", linkLabel = "Open link", buttonIcon = "", buttonClass = "prismatic-button" }) {
  const item = createStreetActionItem({ key, icon, label, text });
  const link = buttonIcon
    ? createImageTrackedLink(href, linkLabel, buttonIcon, {
      track,
      state: show.regionSlug,
      city: show.citySlug,
      showId: show.id,
      trackDestination: destination,
    }, buttonClass)
    : createTrackedLink(href, linkLabel, {
    track,
    state: show.regionSlug,
    city: show.citySlug,
    showId: show.id,
    trackDestination: destination,
  }, "street-card-link");
  item.querySelector("div")?.appendChild(link);
  return item;
}

function createStreetActionItem({ key, icon, label, text }) {
  const item = document.createElement("article");
  item.className = `street-action-item street-action-item--${key}`;
  item.innerHTML = `
    <div>
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(text)}</span>
    </div>
  `;
  return item;
}

function createCaptionGenerator(show, flyerState) {
  const section = document.createElement("section");
  section.className = "caption-generator";
  section.dataset.showId = show.id;

  const title = document.createElement("h5");
  title.textContent = "Make a quick post";

  const subtext = document.createElement("p");
  subtext.className = "caption-generator__subtext";
  subtext.textContent = getCaptionSubtext(flyerState);

  const buttons = document.createElement("div");
  buttons.className = "caption-platform-buttons";

  const output = document.createElement("textarea");
  output.className = "caption-output";
  output.readOnly = true;
  output.rows = 8;
  output.value = generateCaption(show, "general");
  output.setAttribute("aria-label", `Generated caption for ${show.showName || show.city}`);

  const status = document.createElement("p");
  status.className = "caption-status";
  status.setAttribute("aria-live", "polite");

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "button open-platform-button";
  openButton.textContent = "Open Platform";

  let selectedPlatform = "general";

  [
    ["instagram", "Copy for Instagram"],
    ["tiktok", "Copy for TikTok"],
    ["facebook", "Copy for Facebook"],
    ["general", "Copy General Caption"],
  ].forEach(([platform, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button caption-platform-button caption-platform-button--${platform}`;
    button.dataset.platform = platform;
    button.textContent = label;
    button.addEventListener("click", async () => {
      selectedPlatform = platform;
      output.value = generateCaption(show, platform);
      updateSelectedCaptionPlatform(buttons, platform);
      updateOpenPlatformButton(openButton, show, platform);
      await copyCaption(output.value, status);
    });
    buttons.appendChild(button);
  });

  const actions = document.createElement("div");
  actions.className = "caption-actions";

  const generateButton = document.createElement("button");
  generateButton.type = "button";
  generateButton.className = "button generate-caption-button";
  generateButton.textContent = "Generate Another";
  generateButton.addEventListener("click", () => {
    output.value = generateCaption(show, selectedPlatform);
    status.textContent = "Fresh caption ready.";
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "button button--primary copy-caption-button";
  copyButton.textContent = "Copy Caption";
  copyButton.addEventListener("click", () => copyCaption(output.value, status));

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "button native-share-button";
  shareButton.textContent = "Share from phone";
  shareButton.hidden = !navigator.share;
  shareButton.addEventListener("click", () => shareCaption(show, output.value, status));

  openButton.addEventListener("click", () => openPlatform(show, selectedPlatform));

  actions.append(generateButton, copyButton, shareButton, openButton);
  section.append(title, subtext, buttons, output, actions, status);
  updateSelectedCaptionPlatform(buttons, selectedPlatform);
  updateOpenPlatformButton(openButton, show, selectedPlatform);
  return section;
}

function updateSelectedCaptionPlatform(container, platform) {
  container.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.platform === platform ? "true" : "false");
  });
}

function getCaptionSubtext(flyerState) {
  if (flyerState.kind === "show") {
    return "Generate a caption, copy it, and post it with the flyer.";
  }

  if (flyerState.kind === "routing") {
    return "City flyer coming soon. Use the routing flyer or share the show link.";
  }

  return "Flyer coming soon. You can still share the show details.";
}

function getShowFlyerState(show) {
  const showAsset = streetTeamState.streetAssets.find((asset) => (
    asset.showId === show.id
    && asset.status.toLowerCase() === "ready"
    && asset.url
    && /^(street-team-download|flyer)$/i.test(asset.assetType)
  ));

  if (showAsset) {
    return { kind: "show", asset: showAsset, notice: "" };
  }

  const routingAsset = streetTeamState.streetAssets.find((asset) => (
    asset.assetId === ROUTING_FLYER_ASSET_ID
    && asset.status.toLowerCase() === "ready"
    && asset.url
  ));

  if (routingAsset) {
    return {
      kind: "routing",
      asset: routingAsset,
      notice: "City flyer coming soon. You can use the tour routing flyer for now.",
    };
  }

  return {
    kind: "none",
    asset: null,
    notice: "Flyer coming soon. You can still share the show details.",
  };
}

function getDisplayDownloads(downloads, flyerState) {
  if (flyerState.kind === "routing" && flyerState.asset) {
    return [streetAssetToDownload(flyerState.asset)];
  }

  if (flyerState.kind === "none") {
    return [];
  }

  return downloads;
}

function streetAssetToDownload(asset) {
  return {
    title: asset.title,
    type: asset.downloadType || toTitleCase(asset.assetType),
    url: asset.url,
    preview: asset.preview || asset.url,
    fileType: getFileType(asset.url),
    alt: asset.altText,
    platform: asset.platform,
    usage: asset.usage,
    notes: asset.notes,
    status: asset.status,
    lastUpdated: asset.lastUpdated,
  };
}

function generateCaption(show, platform = "general") {
  const template = CAPTION_TEMPLATES[Math.floor(Math.random() * CAPTION_TEMPLATES.length)];
  const values = getCaptionValues(show, platform);
  let caption = Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`[${key}]`, value), template);

  caption = cleanupCaption(caption);

  if (platform === "tiktok") {
    caption = shortenCaption(caption, 460);
    caption = limitHashtags(caption, ["#Oathbound", "#MyspaceTour", `#${values.CityHashtag}`, "#LiveMusic", "#Metalcore"]);
  }

  if (platform === "facebook") {
    caption = limitHashtags(caption, ["#Oathbound", "#MyspaceTour", "#LiveMusic"]);
  }

  if (platform === "instagram") {
    caption = limitHashtags(caption, ["#Oathbound", "#MyspaceTour", `#${values.CityHashtag}`, "#LiveMusic", "#Metalcore"]);
  }

  return cleanupCaption(caption);
}

function getCaptionValues(show, platform) {
  const lineup = getCaptionLineup(show);
  const regionHashtag = toHashtagPart(show.regionName || show.region);

  return {
    City: show.city || "your city",
    Region: show.region || "",
    RegionName: show.regionName || show.region || "",
    Market: show.market || show.city || "",
    Venue: show.venue || "the venue",
    Date: show.date ? formatFanDate(parseLocalDate(show.date)) : "date TBA",
    Time: show.showTime ? formatTime(show.showTime) : show.doorsTime ? formatTime(show.doorsTime) : "time TBA",
    Doors: show.doorsTime ? formatTime(show.doorsTime) : "",
    Lineup: lineup,
    AgeRestriction: show.ageRestriction || "",
    TicketInfo: getCaptionTicketInfo(show, platform),
    BandTags: getBandTags(show, platform),
    CityHashtag: toHashtagPart(show.city),
    RegionHashtag: regionHashtag,
  };
}

function getCaptionLineup(show) {
  if (Array.isArray(show.lineupArtists) && show.lineupArtists.length) {
    return show.lineupArtists.map((artist) => String(artist).trim()).filter(Boolean).join(" / ");
  }

  return show.lineup || "Lineup TBA";
}

function getCaptionTicketInfo(show, platform) {
  const bioText = getMainBandBioText(show, platform);

  if (isFreeShow(show)) {
    return show.ticketUrl || show.infoUrl ? `Free show. Bring a friend.` : "Free show.";
  }

  if (isDoorSalesOnly(show)) {
    return getDoorSalesOnlyLabel(show);
  }

  if (show.ticketUrl || show.infoUrl) {
    return `Tickets/info are in ${bioText}.`;
  }

  return "Ticket/info details coming soon.";
}

function getBandTags(show, platform) {
  if (platform === "general") {
    platform = "instagram";
  }

  const handles = collectShowBands(show)
    .map((band) => getPlatformHandle(band, platform))
    .filter(Boolean);

  return Array.from(new Set(handles)).join(" ");
}

function getMainBandBioText(show, platform) {
  const tags = getMainBandTags(show, platform);

  if (!tags.length) {
    return platform === "general" ? "the band's bio" : "the band bio";
  }

  if (tags.length === 1) {
    return `the bio for ${tags[0]}`;
  }

  return `the bios for ${tags.slice(0, -1).join(", ")} and ${tags[tags.length - 1]}`;
}

function getMainBandTags(show, platform) {
  const normalizedPlatform = platform === "general" ? "instagram" : platform;
  const bands = [];

  if (show.supportedBand) {
    bands.push(show.supportedBand);
  }

  if (Array.isArray(show.featuredBands)) {
    bands.push(...show.featuredBands.filter((band) => /headline|featured|touring/i.test(`${band.role || ""} ${band.status || ""}`)));
  }

  if (Array.isArray(show.supportingBands)) {
    bands.push(...show.supportingBands.filter((band) => /featured|touring/i.test(`${band.role || ""} ${band.status || ""}`)));
  }

  const tags = bands
    .map((band) => getPlatformHandle(band, normalizedPlatform))
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 2);
}

function collectShowBands(show) {
  const bands = [];
  ["featuredBands", "supportingBands", "supportedBand"].forEach((key) => {
    const value = show[key];
    if (Array.isArray(value)) {
      bands.push(...value);
    } else if (value && typeof value === "object") {
      bands.push(value);
    }
  });
  return bands;
}

function getPlatformHandle(band, platform) {
  const socials = band.socials || band;
  const rawUrl = String(socials?.[platform] || "").trim();

  if (!rawUrl) {
    return "";
  }

  if (platform === "instagram") {
    return extractUrlHandle(rawUrl, "instagram.com");
  }

  if (platform === "tiktok") {
    return extractUrlHandle(rawUrl, "tiktok.com");
  }

  if (platform === "facebook") {
    return extractFacebookHandle(rawUrl);
  }

  return "";
}

function extractUrlHandle(rawUrl, domain) {
  if (rawUrl.startsWith("@")) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes(domain)) {
      return "";
    }
    const handle = url.pathname.split("/").filter(Boolean)[0] || "";
    return handle ? `@${handle.replace(/^@/, "")}` : "";
  } catch {
    return "";
  }
}

function extractFacebookHandle(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes("facebook.com")) {
      return "";
    }
    const handle = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!handle || /^profile\.php$/i.test(handle) || /^pages$/i.test(handle)) {
      return "";
    }
    return `@${handle}`;
  } catch {
    return "";
  }
}

function toHashtagPart(value = "") {
  return String(value).replace(/[^a-z0-9]/gi, "");
}

function getCaptionHashtags(values, extraCount = 5) {
  const extras = ["Metalcore", "PostHardcore", "Hardcore", "HeavyMusic", "LocalShows", "SupportLocalMusic", "StreetTeam", values.CityHashtag, values.RegionHashtag]
    .filter(Boolean)
    .map((tag) => `#${tag.replace(/^#/, "")}`);
  return Array.from(new Set(["#Oathbound", "#MyspaceTour", "#LiveMusic", ...extras])).slice(0, 3 + extraCount);
}

function ensureHashtags(caption, hashtags) {
  const existing = new Set((caption.match(/#[a-z0-9_]+/gi) || []).map((tag) => tag.toLowerCase()));
  const additions = hashtags.filter((tag) => !existing.has(tag.toLowerCase()));
  return additions.length ? `${caption}\n${additions.join(" ")}` : caption;
}

function limitHashtags(caption, hashtags) {
  const withoutTags = cleanupCaption(caption.replace(/(?:^|\s)#[a-z0-9_]+/gi, " "));
  const cleanTags = hashtags.filter((tag) => /^#[a-z0-9_]+$/i.test(tag));
  return cleanupCaption(`${withoutTags}\n\n${Array.from(new Set(cleanTags)).join(" ")}`);
}

function shortenCaption(caption, maxLength) {
  if (caption.length <= maxLength) {
    return caption;
  }

  const paragraphs = caption.split(/\n{2,}/).filter(Boolean);
  return cleanupCaption(paragraphs.slice(0, 4).join("\n\n"));
}

function cleanupCaption(caption) {
  return String(caption)
    .replace(/\[(?:Region|RegionName|Market|Doors|AgeRestriction|BandTags|CityHashtag|RegionHashtag)\]/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && !/^(undefined|null)$/i.test(line))
    .join("\n")
    .replace(/#(?=\s|$)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function copyCaption(caption, status) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(caption);
    status.textContent = "Copied. Go make the internet noisy.";
  } catch {
    if (fallbackCopyCaption(caption)) {
      status.textContent = "Copied. Go make the internet noisy.";
      return;
    }
    status.textContent = "Copy did not fire. The caption is ready to select above.";
  }
}

function fallbackCopyCaption(caption) {
  const textarea = document.createElement("textarea");
  textarea.value = caption;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

async function shareCaption(show, caption, status) {
  if (!navigator.share) {
    await copyCaption(caption, status);
    return;
  }

  try {
    await navigator.share({
      title: show.showName || `Oathbound in ${show.city}`,
      text: caption,
      url: show.ticketUrl || show.infoUrl || window.location.href,
    });
    status.textContent = "Shared. Go make the internet noisy.";
  } catch {
    await copyCaption(caption, status);
  }
}

function updateOpenPlatformButton(button, show, platform) {
  button.textContent = platform === "general" ? "Open Platform" : `Open ${getPlatformLabel(platform)}`;
  button.hidden = false;
  button.disabled = false;
  button.setAttribute("aria-disabled", "false");

  if (platform === "general") {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  }
}

function getPlatformLabel(platform) {
  return {
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
  }[platform] || toTitleCase(platform);
}

function openPlatform(show, platform) {
  const url = getPlatformOpenUrl(show, platform);
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function getPlatformOpenUrl(show, platform) {
  if (platform === "instagram") {
    return "https://www.instagram.com/";
  }

  if (platform === "tiktok") {
    return "https://www.tiktok.com/";
  }

  if (platform === "facebook") {
    if (show.facebookShareUrl) {
      return show.facebookShareUrl;
    }
    if (show.facebookEventUrl) {
      return show.facebookEventUrl;
    }
    const shareUrl = show.ticketUrl || show.infoUrl || window.location.href;
    return shareUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` : "https://www.facebook.com/";
  }

  return "";
}

function getShowBadges(show) {
  const badges = [];

  if (show.ageRestriction) {
    const ageKey = show.ageRestriction.includes("21") ? "21" : "all-ages";
    badges.push({
      label: show.ageRestriction,
      icon: `${siteRoot}/assets/icons/300x300/${ageKey}-300x300.png`,
    });
  }

  if (isFreeShow(show)) {
    badges.push({
      label: "Free show",
      icon: `${siteRoot}/assets/icons/300x300/free-show-300x300.png`,
    });
  }

  if (isDoorSalesOnly(show)) {
    badges.push({
      label: getDoorSalesOnlyLabel(show),
      className: "street-text-badge street-text-badge--door-sales",
    });
  }

  if (show.ticketUrl || show.infoUrl) {
    badges.push({
      label: show.ticketUrl ? show.ticketLabel || "Tickets" : show.infoLabel || "Details",
      icon: BUTTON_ICONS.tickets,
      href: show.ticketUrl || show.infoUrl,
      track: show.ticketUrl ? "street-team-ticket" : "street-team-details",
    });
  }

  return badges;
}

function renderShowBadge(badge, show) {
  if (!badge.icon) {
    return `<span class="${escapeHtml(badge.className || "street-text-badge")}" title="${escapeHtml(badge.label)}">${escapeHtml(badge.label)}</span>`;
  }

  const image = `<img src="${escapeHtml(badge.icon)}" alt="${escapeHtml(badge.label)}" loading="lazy">`;

  if (!badge.href) {
    return `<span class="street-icon-badge" title="${escapeHtml(badge.label)}">${image}</span>`;
  }

  return `
    <a class="street-icon-badge street-icon-badge--link street-icon-badge--ticket" href="${escapeHtml(badge.href)}" title="${escapeHtml(badge.label)}" data-track="${escapeHtml(badge.track)}" data-state="${escapeHtml(show.regionSlug)}" data-city="${escapeHtml(show.citySlug)}" data-show-id="${escapeHtml(show.id)}" target="_blank" rel="noopener noreferrer">
      ${image}
    </a>
  `;
}

function getShowResourceDownloads(show) {
  const seen = new Set();
  const downloads = [];

  [...getShowDownloads(show), ...getCityDownloads(show)].forEach((download) => {
    const key = getDownloadDedupeKey(download);

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    downloads.push(download);
  });

  return downloads;
}

function getDownloadDedupeKey(download) {
  const url = String(download.url || download.preview || "").trim();

  if (url) {
    return normalizeAssetUrl(url)
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/\/+/g, "/")
      .toLowerCase();
  }

  return String(download.title || "").trim().toLowerCase();
}

function getShowSocialAssets(show) {
  return streetTeamState.streetAssets.filter((asset) => {
    if (!asset.url || asset.includeInDownloads || /draft|hidden|archived/i.test(asset.status)) {
      return false;
    }

    return asset.showId === show.id || asset.kitKey === show.kitKey;
  });
}

function isFreeShow(show) {
  return show.isFreeShow === true || /\bfree\b/i.test(`${show.ticketLabel || ""} ${show.notes || ""}`);
}

function isDoorSalesOnly(show) {
  if (show.doorSalesOnly === true) {
    return true;
  }

  const status = String(show.ticketStatus || "").trim().toLowerCase();
  return status === "door-sales-only" || status === "door sales only";
}

function getDoorSalesOnlyLabel(show) {
  return String(show.ticketDisplayLabel || "").trim() || "Door sales only";
}

function createDownloadCard(download, show = null) {
  const card = document.createElement("article");
  card.className = "download-card";

  if (download.preview) {
    const image = document.createElement("img");
    image.src = download.preview;
    image.alt = download.alt || `${download.title} preview`;
    image.loading = "lazy";
    card.appendChild(image);
  }

  const body = document.createElement("div");
  body.className = "download-card__body";

  const title = document.createElement("h4");
  title.textContent = download.title || "Street Team Material";

  const type = document.createElement("p");
  type.textContent = [download.type, download.platform && download.platform !== "all" ? download.platform : "", download.fileType, download.size].filter(Boolean).join(" / ");

  const detail = document.createElement("p");
  detail.className = "download-card__hint";
  detail.textContent = download.usage || download.notes || (show ? `Use this when sharing ${show.city}.` : "Use this for general tour posts.");

  const link = createImageTrackedLink(download.url, "Download", BUTTON_ICONS.download, {
    track: "street-team-download",
    state: show?.regionSlug || "",
    city: show?.citySlug || "",
    showId: show?.id || "",
    downloadTitle: slugify(download.title || ""),
    downloadType: slugify(download.type || "download"),
  }, "prismatic-button prismatic-button--download");
  link.download = "";

  body.append(title, type, detail, link);
  card.appendChild(body);
  return card;
}

function createTrackedLink(url, label, data = {}, className = "button") {
  const link = document.createElement("a");
  link.href = url || STREET_TEAM_SIGNUP_URL;
  link.className = className;
  link.textContent = label;

  if (url?.startsWith("http")) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      link.dataset[key] = value;
    }
  });

  return link;
}

function createImageTrackedLink(url, label, imageUrl, data = {}, className = "prismatic-button") {
  const link = createTrackedLink(url, label, data, className);
  link.setAttribute("aria-label", label);
  link.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}" loading="lazy">`;
  return link;
}

function wireImageFallback(image) {
  if (!image) {
    return;
  }

  image.addEventListener("error", () => {
    const fallbackSrc = image.dataset.fallbackSrc;
    const finalFallbackSrc = image.dataset.finalFallbackSrc;

    if (fallbackSrc && image.src !== fallbackSrc) {
      image.src = fallbackSrc;
      image.dataset.fallbackSrc = "";
      return;
    }

    if (finalFallbackSrc && image.src !== finalFallbackSrc) {
      image.src = finalFallbackSrc;
      image.dataset.finalFallbackSrc = "";
    }
  });
}

function getCityDownloads(show) {
  return streetTeamState.downloads.cities?.[show.kitKey] || [];
}

function getShowDownloads(show) {
  return streetTeamState.downloads.shows?.[show.id] || [];
}

function getAreaDownloads(shows) {
  const seen = new Set();
  const downloads = [];

  shows.forEach((show) => {
    [...getShowDownloads(show), ...getCityDownloads(show)].forEach((download) => {
      const key = download.url || download.title;

      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      downloads.push({ download, show });
    });
  });

  return downloads;
}

function renderSafeMessage(message, isError = false) {
  showsContainer.innerHTML = `<div class="${isError ? "error-state" : "empty-state"}"><h3>Street team updates</h3><p>${escapeHtml(message)}</p></div>`;
}

function wireTracking() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-track]");

    if (!target) {
      return;
    }

    window.oathboundAnalytics?.trackEvent?.(target.dataset.track.replace(/-/g, "_"), {
      selected_state: target.dataset.state || "",
      market: target.dataset.market || "",
      city: target.dataset.city || "",
      show_id: target.dataset.showId || "",
      download_title: target.dataset.downloadTitle || "",
      download_type: target.dataset.downloadType || "",
      destination: target.dataset.trackDestination || "",
      link_text: target.textContent.trim(),
    });
  });
}

function wireArtworkModal() {
  const triggers = Array.from(document.querySelectorAll("[data-artwork-modal]"));
  const modal = document.querySelector("#street-team-artwork-modal");
  const closeButton = modal?.querySelector(".artwork-modal__close");
  const modalImage = modal?.querySelector("img");
  let activeTrigger = null;

  if (!triggers.length || !modal || !closeButton || !modalImage) {
    return;
  }

  const openModal = (trigger) => {
    const triggerImage = trigger.querySelector("img");
    modalImage.src = trigger.href || triggerImage?.src || modalImage.src;
    modalImage.alt = triggerImage?.alt || trigger.getAttribute("aria-label") || "Artwork preview";
    activeTrigger = trigger;
    modal.hidden = false;
    document.body.classList.add("has-artwork-modal");
    closeButton.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("has-artwork-modal");
    activeTrigger?.focus();
    activeTrigger = null;
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(trigger);
    });
  });

  closeButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}

function groupBy(items, getKey) {
  const groups = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  });

  return groups;
}

function normalizeCountry(country = "") {
  const normalized = String(country).trim().toUpperCase();

  if (!normalized || normalized === "USA" || normalized === "UNITED STATES") {
    return "US";
  }

  return normalized;
}

function getStreetTeamTips(show) {
  const tips = [
    {
      key: "social",
      label: "Socials",
      text: `Post the flyer, tag friends near ${show.city}, and share the ticket link where local heavy music fans will see it.`,
      icon: `${siteRoot}/assets/icons/90x90/music-90x90.png`,
    },
    {
      key: "in-person",
      label: "In person",
      text: "Print or share flyers where allowed: record stores, coffee shops, venues, rehearsal spaces, campus boards.",
      icon: `${siteRoot}/assets/icons/90x90/lineup-90x90.png`,
    },
  ];

  if (show.ticketUrl || show.infoUrl) {
    tips.push({
      key: "tickets",
      label: "Ticket link",
      text: "Drop the official link with your post so interested people can act right away.",
      icon: `${siteRoot}/assets/icons/90x90/tickets-90x90.png`,
    });
  }

  return tips;
}

function normalizeAssetUrl(url = "") {
  const trimmed = String(url).trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^street-team\//i.test(trimmed)) {
    return `/${trimmed.replace(/^\/+/, "")}`;
  }

  return trimmed.startsWith("/") ? trimmed : `${siteRoot}/${trimmed.replace(/^\.?\//, "")}`;
}

function getFileType(url = "") {
  const extension = url.split("?")[0].split(".").pop();
  return extension ? extension.toUpperCase() : "";
}

function toTitleCase(value = "") {
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeAgeRestriction(ageRestriction = "") {
  const normalized = String(ageRestriction).trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "all ages" || normalized === "all-ages" || normalized === "aa") {
    return "All Ages";
  }

  if (normalized.includes("21")) {
    return "21+";
  }

  if (normalized.includes("18")) {
    return "18+";
  }

  return String(ageRestriction).trim();
}

function normalizeLineup(lineup = "") {
  if (Array.isArray(lineup)) {
    return lineup.map((item) => String(item).trim()).filter(Boolean).join(", ");
  }

  return String(lineup)
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function toTextList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[;|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeShowStatus(status = "") {
  const normalized = String(status).trim().toLowerCase();

  if (!normalized || normalized === "announced") {
    return null;
  }

  if (normalized.includes("cancel")) {
    return { key: "cancelled", label: "Cancelled" };
  }

  if (normalized.includes("relocat") || normalized.includes("moved")) {
    return { key: "relocated", label: "Relocated" };
  }

  return { key: "default", label: status.trim() };
}

function getRegionName(region) {
  const names = {
    AZ: "Arizona",
    CA: "California",
    ID: "Idaho",
    NV: "Nevada",
    OR: "Oregon",
    WA: "Washington",
  };

  return names[region] || region;
}

function formatTimes(show) {
  if (show.doorsTime && show.showTime) {
    return `Doors ${formatTime(show.doorsTime)} / Show ${formatTime(show.showTime)}`;
  }

  if (show.doorsTime) {
    return `Doors ${formatTime(show.doorsTime)}`;
  }

  if (show.showTime) {
    return `Show ${formatTime(show.showTime)}`;
  }

  return "";
}

function formatTime(value) {
  const trimmed = String(value).trim();
  const standardMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!standardMatch) {
    return trimmed;
  }

  const [, hour, minutes = "00", meridiem] = standardMatch;
  return `${Number(hour)}:${minutes} ${meridiem.toUpperCase()}`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMonth(date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function formatDay(date) {
  return date.toLocaleDateString("en-US", { day: "2-digit" });
}

function formatLongDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFanDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[character]));
}

function getSiteRoot() {
  try {
    return new URL(rootPath, `${window.location.origin}${window.location.pathname}`).pathname.replace(/\/$/, "") || "";
  } catch {
    return "";
  }
}
