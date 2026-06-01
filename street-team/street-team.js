const STREET_TEAM_SIGNUP_URL = "https://oathboundband.com/street-team-signup";
const rootPath = document.body.dataset.root || "..";
const siteRoot = getSiteRoot();
const stateSelector = document.querySelector("#state-selector");
const showsContainer = document.querySelector("#street-team-shows");
const showCount = document.querySelector("#street-team-show-count");
const generalDownloadsContainer = document.querySelector("#general-downloads");
const downloadsFallback = document.querySelector("#downloads-fallback");

let streetTeamState = {
  shows: [],
  downloads: { general: [], cities: {}, shows: {} },
  selectedRegion: "",
};

loadStreetTeamPage();
wireTracking();

async function loadStreetTeamPage() {
  const [showsResult, downloadsResult] = await Promise.allSettled([
    fetchJson(`${siteRoot}/data/shows.json`),
    fetchJson(`${siteRoot}/street-team/street-team-downloads.json`),
  ]);

  if (downloadsResult.status === "fulfilled") {
    streetTeamState.downloads = normalizeDownloads(downloadsResult.value);
    renderGeneralDownloads();
  } else {
    downloadsFallback.hidden = false;
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
      <img src="${getStateIconPath(region)}" alt="${escapeHtml(region.label)}" loading="lazy">
      <small>${region.count} ${region.count === 1 ? "show" : "shows"}</small>
    `;
    button.addEventListener("click", () => {
      streetTeamState.selectedRegion = region.slug;
      renderStateSelector(regions);
      renderShowsForState();
      document.querySelector("#street-team-shows")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    stateSelector.appendChild(button);
  });
}

function getStateIconPath(region) {
  const stateName = slugify(region.label || region.abbreviation || "");
  return `${siteRoot}/assets/icons/states/full-size-300x300/${stateName}-blue-300x300.png`;
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
  const firstDownloadIndex = marketEntries.findIndex(([, marketShows]) => getAreaDownloads(marketShows).length > 0);
  const defaultOpenIndex = firstDownloadIndex >= 0 ? firstDownloadIndex : 0;

  marketEntries.forEach(([market, marketShows], index) => {
    fragment.appendChild(createAreaCard(market, marketShows, index === defaultOpenIndex));
  });

  showsContainer.appendChild(fragment);
}

function createAreaCard(market, marketShows, isOpen) {
  const section = document.createElement("section");
  const marketSlug = slugify(market);
  const areaDownloads = getAreaDownloads(marketShows);

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
      <small>${marketShows.length} upcoming ${marketShows.length === 1 ? "show" : "shows"} / ${areaDownloads.length} ${areaDownloads.length === 1 ? "file" : "files"}</small>
    </span>
    <span class="market-toggle__cue" aria-hidden="true">${isOpen ? "-" : "+"}</span>
  `;

  const panel = document.createElement("div");
  panel.id = `market-panel-${marketSlug}`;
  panel.className = "market-panel";
  panel.hidden = !isOpen;

  const actionRow = document.createElement("div");
  actionRow.className = "area-actions";
  actionRow.appendChild(createTrackedLink(STREET_TEAM_SIGNUP_URL, "Join Street Team", {
    track: "street-team-join",
    state: marketShows[0]?.regionSlug || "",
    market,
    trackDestination: "godaddy-form",
  }, "button button--primary"));

  panel.appendChild(actionRow);

  if (areaDownloads.length) {
    const downloads = document.createElement("div");
    downloads.className = "download-grid download-grid--tiny";
    areaDownloads.forEach(({ download, show }) => downloads.appendChild(createDownloadCard(download, show)));
    panel.appendChild(downloads);
  } else {
    const note = document.createElement("p");
    note.className = "street-team-note";
    note.textContent = "City-specific flyers and graphics coming soon. You can still use the general Street Team Kit or join for updates.";
    panel.appendChild(note);
  }

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

  card.className = isCancelled ? "street-show-card street-show-card--compact street-show-card--cancelled" : "street-show-card street-show-card--compact";
  card.dataset.track = "street-team-view-show";
  card.dataset.showId = show.id;
  card.dataset.state = show.regionSlug;
  card.dataset.city = show.citySlug;

  const statusChip = normalizedStatus ? `<span class="status-chip status-chip--${escapeHtml(normalizedStatus.key)}">${escapeHtml(normalizedStatus.label)}</span>` : "";
  const venue = isAreaOnly ? "Area details TBA" : escapeHtml(show.venue || "Venue TBA");
  const dateLine = isAreaOnly ? "Details TBA" : escapeHtml(formatLongDate(parseLocalDate(show.date)));
  const timeLine = isAreaOnly ? "" : formatTimes(show);
  const age = show.ageRestriction ? `<span>${escapeHtml(show.ageRestriction)}</span>` : "";

  card.innerHTML = `
    <div class="street-show-card__main">
      <div class="street-show-card__date">
        <span>${escapeHtml(formatMonth(parseLocalDate(show.date)))}</span>
        <strong>${escapeHtml(formatDay(parseLocalDate(show.date)))}</strong>
      </div>
      <div class="street-show-card__body">
        <div class="show-flags">${statusChip}</div>
        <h4>${venue}</h4>
        <p class="show-location">${escapeHtml(location)}</p>
        <p class="show-time">${dateLine}${timeLine ? ` / ${escapeHtml(timeLine)}` : ""}</p>
      </div>
      <div class="street-show-card__meta">${age}</div>
    </div>
  `;

  if (!isCancelled) {
    const actions = document.createElement("div");
    actions.className = "street-show-card__actions";
    const primaryUrl = show.ticketUrl || show.infoUrl;

    if (primaryUrl) {
      actions.appendChild(createTrackedLink(primaryUrl, show.ticketUrl ? show.ticketLabel || "Tickets" : show.infoLabel || "Details", {
        track: show.ticketUrl ? "street-team-ticket" : "street-team-details",
        state: show.regionSlug,
        city: show.citySlug,
        showId: show.id,
      }, "text-link"));
    }

    card.appendChild(actions);
  }

  return card;
}

function renderGeneralDownloads() {
  generalDownloadsContainer.innerHTML = "";

  const downloads = streetTeamState.downloads.general || [];
  if (!downloads.length) {
    generalDownloadsContainer.innerHTML = `<p class="street-team-note">General flyers and graphics are being updated.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  downloads.forEach((download) => fragment.appendChild(createDownloadCard(download)));
  generalDownloadsContainer.appendChild(fragment);
}

function createDownloadCard(download, show = null) {
  const card = document.createElement("article");
  card.className = "download-card";

  if (download.preview) {
    const image = document.createElement("img");
    image.src = download.preview;
    image.alt = `${download.title} preview`;
    image.loading = "lazy";
    card.appendChild(image);
  }

  const body = document.createElement("div");
  body.className = "download-card__body";

  const title = document.createElement("h4");
  title.textContent = download.title || "Street Team Material";

  const type = document.createElement("p");
  type.textContent = [download.type, download.fileType, download.size].filter(Boolean).join(" / ");

  const link = createTrackedLink(download.url, "Download", {
    track: "street-team-download",
    state: show?.regionSlug || "",
    city: show?.citySlug || "",
    showId: show?.id || "",
    downloadTitle: slugify(download.title || ""),
    downloadType: slugify(download.type || "download"),
  }, "button button--primary");
  link.download = "";

  body.append(title, type, link);
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
