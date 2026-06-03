const STREET_TEAM_SIGNUP_URL = "https://oathboundband.com/street-team-signup";
const rootPath = document.body.dataset.root || "..";
const siteRoot = getSiteRoot();
const stateSelector = document.querySelector("#state-selector");
const showsContainer = document.querySelector("#street-team-shows");
const showCount = document.querySelector("#street-team-show-count");
const generalDownloadsContainer = document.querySelector("#general-downloads");
const downloadsFallback = document.querySelector("#downloads-fallback");
const BUTTON_ICONS = {
  download: `${siteRoot}/assets/icons/buttons/300x169/download-button-prismatic-300x169.png`,
  join: `${siteRoot}/assets/icons/buttons/300x169/sign-up-button-prismatic-300x169.png`,
  area: `${siteRoot}/assets/icons/buttons/300x169/pick-your-area-button-prismatic-300x169.png`,
  tickets: `${siteRoot}/assets/icons/buttons/300x169/tickets-button-prismatic-300x169.png`,
};

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
  } else {
    downloadsFallback.hidden = false;
  }

  if (streetAssetsResult.status === "fulfilled") {
    streetTeamState.streetAssets = Array.isArray(streetAssetsResult.value) ? streetAssetsResult.value.map(normalizeStreetAsset) : [];
    mergeStreetAssetsIntoDownloads(streetTeamState.streetAssets);
  }

  renderGeneralDownloads();

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
      <img src="${getStateIconPath(region)}" alt="${escapeHtml(region.label)}" loading="eager" onerror="this.onerror=null; this.src='${getStateIconFallbackPath(region)}';">
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

  stateSelector.appendChild(createUnlistedStateButton());
}

function getStateIconPath(region) {
  const stateName = slugify(region.label || region.abbreviation || "");
  return `${siteRoot}/assets/icons/300x300/${stateName}-prismatic-300x300.png`;
}

function getStateIconFallbackPath(region) {
  const stateName = slugify(region.label || region.abbreviation || "");
  return `${siteRoot}/assets/icons/states/full-size-300x300/${stateName}-blue-300x300.png`;
}

function createUnlistedStateButton() {
  const link = document.createElement("a");
  link.className = "state-button state-button--link";
  link.href = "#my-state-is-not-listed";
  link.dataset.track = "street-team-state-select";
  link.dataset.state = "not-listed";
  link.setAttribute("aria-label", "My state is not listed");
  link.innerHTML = `
    <img src="${siteRoot}/assets/icons/300x300/my_state_isnt_listed_transparent.png" alt="My state is not listed" loading="eager" onerror="this.onerror=null; this.src='${siteRoot}/assets/icons/states/full-size-300x300/my-state-isnt-listed.png';">
    <small>My state isn't listed</small>
  `;
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

  marketEntries.forEach(([market, marketShows]) => {
    fragment.appendChild(createAreaCard(market, marketShows, false));
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
    card.appendChild(createShowResourceSection(show, downloads, socialAssets));
  }

  return card;
}

function createShowResourceSection(show, downloads, socialAssets) {
  const section = document.createElement("div");
  section.className = "street-show-resources";

  if (downloads.length) {
    const downloadsRow = document.createElement("div");
    downloadsRow.className = "show-downloads";

    const title = document.createElement("h5");
    title.textContent = "Show flyer";

    const downloadsGrid = document.createElement("div");
    downloadsGrid.className = "download-grid download-grid--tiny";
    downloads.forEach((download) => downloadsGrid.appendChild(createDownloadCard(download, show)));

    downloadsRow.append(title, downloadsGrid);
    section.appendChild(downloadsRow);
  }

  const grid = document.createElement("div");
  grid.className = "street-action-grid";
  grid.setAttribute("aria-label", "Street team resources for this show");

  if (downloads.length) {
    grid.appendChild(createStreetActionItem({
      key: "in-person",
      label: "Flyer run",
      text: "Print or post this flyer where it is allowed: venues, record stores, coffee shops, rehearsal spaces, and campus boards.",
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
    const key = download.url || download.title;

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    downloads.push(download);
  });

  return downloads;
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
  const trigger = document.querySelector("[data-artwork-modal]");
  const modal = document.querySelector("#street-team-artwork-modal");
  const closeButton = modal?.querySelector(".artwork-modal__close");

  if (!trigger || !modal || !closeButton) {
    return;
  }

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add("has-artwork-modal");
    closeButton.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("has-artwork-modal");
    trigger.focus();
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openModal();
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
