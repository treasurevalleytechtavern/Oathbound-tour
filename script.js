const pageMode = document.body.dataset.page === "past" ? "past" : "upcoming";
const rootPath = document.body.dataset.root || ".";
const rawShowLimit = Number(document.body.dataset.showLimit || 0);
const showLimit = Number.isFinite(rawShowLimit) && rawShowLimit > 0 ? rawShowLimit : 0;
const showDirections = document.body.dataset.showDirections !== "false";
const showsList = document.querySelector("#shows-list");
const showCount = document.querySelector("#show-count");
const template = document.querySelector("#show-card-template");
const widgetFooter = document.querySelector(".widget-footer");
const tourFinder = document.querySelector("[data-tour-finder]");
const findNearestButton = document.querySelector("[data-find-nearest-show]");
const tourFinderStatus = document.querySelector("[data-tour-finder-status]");
const streetTeamSignupUrl = "https://oathboundband.com/street-team-signup";
const streetTeamPageUrl = `${rootPath}/street-team/`;
const buttonIcons = {
  signUp: `${rootPath}/assets/icons/buttons/300x169/sign-up-button-prismatic-300x169.png`,
};
const showUrlParams = new URLSearchParams(window.location.search);
const initialTargetSlug = normalizeSlug(showUrlParams.get("show") || showUrlParams.get("city") || showUrlParams.get("location") || "");
const initialTargetVenueSlug = normalizeSlug(showUrlParams.get("venue") || showUrlParams.get("venueSlug") || showUrlParams.get("venueId") || "");
const shouldFilterTargetShows = ["1", "true", "yes", "only"].includes((showUrlParams.get("filter") || "").toLowerCase());
let currentShows = [];
let activeTargetSlug = initialTargetVenueSlug ? "" : initialTargetSlug;
let activeTargetVenueSlug = initialTargetVenueSlug;
let activeTargetSource = initialTargetSlug || initialTargetVenueSlug ? "url" : "";
let activeTargetDistanceMiles = null;
let pendingTargetScroll = Boolean(initialTargetSlug || initialTargetVenueSlug);
const isMyspaceTheme = document.documentElement.classList.contains("myspace-theme")
  && document.body.dataset.page === "upcoming";

const showCoordinatesBySlug = {
  albany: { latitude: 44.6365, longitude: -123.1059 },
  "citrus-heights": { latitude: 38.7071, longitude: -121.2811 },
  eugene: { latitude: 44.0521, longitude: -123.0868 },
  "los-angeles": { latitude: 34.0522, longitude: -118.2437 },
  medford: { latitude: 42.3265, longitude: -122.8756 },
  palmdale: { latitude: 34.5794, longitude: -118.1165 },
  portland: { latitude: 45.5152, longitude: -122.6784 },
  reno: { latitude: 39.5296, longitude: -119.8138 },
  "san-diego": { latitude: 32.7157, longitude: -117.1611 },
  "san-luis-obispo": { latitude: 35.2828, longitude: -120.6596 },
};

const copy = {
  upcoming: {
    emptyTitle: "NO UPCOMING SHOWS RIGHT NOW",
    emptyText: `We're between runs, but the next one is always being built. Join the <a class="empty-state__highlight" href="${streetTeamPageUrl}">Street Team</a> to tell us where you are, help spread the word, and show us where Oathbound should come next.`,
    countLabel: (count) => `${count} upcoming ${count === 1 ? "show" : "shows"}`,
  },
  past: {
    emptyTitle: "No past shows listed",
    emptyText: "Past dates will appear here once they are added to the show data.",
    countLabel: (count) => `${count} past ${count === 1 ? "show" : "shows"}`,
  },
};

if (isMyspaceTheme) {
  renderTourFriends();
}

if (findNearestButton && pageMode !== "upcoming") {
  tourFinder?.remove();
}

findNearestButton?.addEventListener("click", findNearestShow);

loadShows();

async function loadShows() {
  try {
    const response = await fetch(`${rootPath}/data/shows.json`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load show data: ${response.status}`);
    }

    const shows = await response.json();
    const filteredShows = filterShows(shows, pageMode);
    currentShows = filteredShows;
    renderShows(filteredShows);
  } catch (error) {
    if (isMyspaceTheme) {
      renderTourFriends();
    }

    renderUnavailableState();
    console.error(error);
  }
}

function filterShows(shows, mode) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return shows
    .filter((show) => Boolean(show.date))
    .filter((show) => {
      const showDate = parseLocalDate(show.date);
      return mode === "past" ? showDate < today : showDate >= today;
    })
    .sort((a, b) => {
      const first = parseLocalDate(a.date).getTime();
      const second = parseLocalDate(b.date).getTime();
      return mode === "past" ? second - first : first - second;
    });
}

function prepareShowsForDisplay(shows) {
  if (pageMode !== "upcoming" || !hasActiveTarget()) {
    return shows;
  }

  const targetShows = shows.filter(isTargetShow);

  if (!targetShows.length) {
    setTourFinderStatus(`No upcoming shows found for ${getActiveTargetLabel()}.`);
    return shows;
  }

  if (shouldFilterTargetShows && activeTargetSource === "url") {
    setTourFinderStatus(`Showing ${targetShows.length} ${targetShows.length === 1 ? "show" : "shows"} for ${formatTargetLocation(targetShows[0])}.`);
    return targetShows;
  }

  return shows;
}

function findNearestShow() {
  if (!navigator.geolocation) {
    setTourFinderStatus("Location lookup is not available in this browser. Check out the upcoming shows below.");
    return;
  }

  setNearestButtonState(true);
  setTourFinderStatus("Checking your location...");

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const nearest = findNearestShowFromCoordinates(coords.latitude, coords.longitude);

      if (!nearest) {
        setNearestButtonState(false);
        setTourFinderStatus("We could not match your location to a tour stop. Check out the upcoming shows below.");
        return;
      }

      activeTargetSlug = getShowSlug(nearest.show);
      activeTargetVenueSlug = "";
      activeTargetSource = "nearest";
      activeTargetDistanceMiles = nearest.distance;
      pendingTargetScroll = true;
      updateShowUrl(activeTargetSlug);
      setNearestButtonState(false);
      setTourFinderStatus(`${formatTargetLocation(nearest.show)} is the nearest upcoming stop, about ${Math.round(nearest.distance)} miles away.`);
      renderShows(currentShows);
    },
    () => {
      setNearestButtonState(false);
      setTourFinderStatus("Location permission was not shared. Check out the upcoming shows below.");
    },
    {
      enableHighAccuracy: false,
      maximumAge: 300000,
      timeout: 10000,
    },
  );
}

function findNearestShowFromCoordinates(latitude, longitude) {
  let nearest = null;

  currentShows.forEach((show) => {
    const coordinates = getShowCoordinates(show);

    if (!coordinates) {
      return;
    }

    const distance = getDistanceInMiles(latitude, longitude, coordinates.latitude, coordinates.longitude);

    if (!nearest || distance < nearest.distance) {
      nearest = { show, distance };
    }
  });

  return nearest;
}

function decorateTargetCard(card, show) {
  const slug = getShowSlug(show);
  const venueSlug = getShowVenueSlug(show);

  if (slug) {
    card.id = `show-${slug}-${normalizeSlug(show.date || "date")}`;
    card.dataset.showSlug = slug;
  }

  if (venueSlug) {
    card.dataset.venueSlug = venueSlug;
  }

  if (isTargetShow(show)) {
    card.classList.add("show-card--target");
    card.setAttribute("tabindex", "-1");
  }
}

function appendDistanceBadge(container, show) {
  if (!container || !activeTargetDistanceMiles || !isTargetShow(show)) {
    return;
  }

  container.appendChild(createDistanceBadge(activeTargetDistanceMiles));
}

function createDistanceBadge(distanceMiles) {
  const badge = document.createElement("span");
  badge.className = "show-distance-badge";
  badge.textContent = `About ${Math.round(distanceMiles)} mi away`;
  return badge;
}

function finishTargetRender(displayedShows) {
  if (pageMode !== "upcoming" || !hasActiveTarget()) {
    return;
  }

  const targetShow = displayedShows.find(isTargetShow);

  if (!targetShow) {
    return;
  }

  if (activeTargetSource === "url") {
    if (shouldFilterTargetShows) {
      setTourFinderStatus(`Showing only ${formatTargetTargetText(targetShow)}.`);
      return;
    }

    setTourFinderStatus(`Jumped to ${formatTargetTargetText(targetShow)}. The tour stays in date order.`);
  }

  if (!pendingTargetScroll) {
    return;
  }

  pendingTargetScroll = false;
  requestAnimationFrame(() => {
    const targetCard = showsList.querySelector(".show-card--target, .myspace-show-card.show-card--target");

    if (!targetCard) {
      return;
    }

    targetCard.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
    targetCard.focus({ preventScroll: true });
  });
}

function getShowSlug(show) {
  return normalizeSlug(show.citySlug || show.id || show.city || "");
}

function getShowTargetValues(show) {
  const showId = normalizeSlug(show.id || "");
  const values = [
    show.citySlug,
    show.city,
    show.id,
    show.showName,
  ].map(normalizeSlug).filter(Boolean);

  if (showId) {
    values.push(showId.replace(/-[a-z]{2}$/, ""));
  }

  return Array.from(new Set(values));
}

function getShowVenueSlug(show) {
  return normalizeSlug(show.venueRef?.venueSlug || show.venue || "");
}

function getShowVenueTargetValues(show) {
  return [
    show.venueRef?.venueSlug,
    show.venueRef?.venueId,
    show.venueRef?.venue,
    show.venue,
  ].map(normalizeSlug).filter(Boolean);
}

function isTargetShow(show) {
  if (activeTargetVenueSlug) {
    return getShowVenueTargetValues(show).includes(activeTargetVenueSlug);
  }

  return Boolean(activeTargetSlug && getShowTargetValues(show).includes(activeTargetSlug));
}

function hasActiveTarget() {
  return Boolean(activeTargetSlug || activeTargetVenueSlug);
}

function getActiveTargetLabel() {
  return (activeTargetVenueSlug || activeTargetSlug || "that location").replace(/-/g, " ");
}

function normalizeSlug(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getShowCoordinates(show) {
  return showCoordinatesBySlug[getShowSlug(show)] || null;
}

function getDistanceInMiles(firstLatitude, firstLongitude, secondLatitude, secondLongitude) {
  const earthRadiusMiles = 3958.8;
  const firstLatRadians = toRadians(firstLatitude);
  const secondLatRadians = toRadians(secondLatitude);
  const latDelta = toRadians(secondLatitude - firstLatitude);
  const lonDelta = toRadians(secondLongitude - firstLongitude);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(firstLatRadians) * Math.cos(secondLatRadians) * Math.sin(lonDelta / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function formatTargetLocation(show) {
  return [show.city, show.region].filter(Boolean).join(", ") || show.city || "that city";
}

function formatTargetTargetText(show) {
  if (activeTargetVenueSlug && show.venue) {
    return `${show.venue} in ${formatTargetLocation(show)}`;
  }

  return formatTargetLocation(show);
}

function updateShowUrl(slug) {
  const url = new URL(window.location.href);
  url.searchParams.set("show", slug);
  url.searchParams.delete("venue");
  url.searchParams.delete("venueSlug");
  url.searchParams.delete("venueId");
  url.searchParams.delete("filter");
  window.history.replaceState({}, "", url);
}

function setNearestButtonState(isLoading) {
  if (!findNearestButton) {
    return;
  }

  findNearestButton.disabled = isLoading;
  findNearestButton.setAttribute("aria-label", isLoading ? "Finding nearest show" : "Find nearest show");
}

function setTourFinderStatus(message) {
  if (tourFinderStatus) {
    tourFinderStatus.textContent = message;
  }
}

function renderShows(shows) {
  showsList.innerHTML = "";
  const preparedShows = prepareShowsForDisplay(shows);
  const displayedShows = showLimit && pageMode === "upcoming" ? preparedShows.slice(0, showLimit) : preparedShows;
  const hasMoreShows = showLimit && pageMode === "upcoming" && preparedShows.length > displayedShows.length;
  const isEmptyUpcoming = pageMode === "upcoming" && !displayedShows.length;
  window.oathboundAnalytics?.trackShowList(displayedShows);

  if (showCount) {
    showCount.textContent = isEmptyUpcoming
      ? ""
      : isMyspaceTheme
      ? `${displayedShows.length} ${displayedShows.length === 1 ? "show" : "shows"}`
      : hasMoreShows
        ? `Next ${displayedShows.length} of ${preparedShows.length} upcoming shows`
        : copy[pageMode].countLabel(displayedShows.length);
  }

  if (tourFinder && pageMode === "upcoming") {
    tourFinder.hidden = isEmptyUpcoming;
  }

  if (widgetFooter) {
    widgetFooter.hidden = !hasMoreShows;
  }

  if (!displayedShows.length) {
    renderMessage("empty-state", copy[pageMode].emptyTitle, copy[pageMode].emptyText, pageMode === "upcoming"
      ? { label: "Sign Up", url: streetTeamSignupUrl, imageUrl: buttonIcons.signUp }
      : null);
    return;
  }

  if (pageMode === "past") {
    renderPastShowsByYear(displayedShows);
    return;
  }

  if (isMyspaceTheme) {
    renderMyspaceUpcomingShows(displayedShows);
    renderTourFriends(displayedShows);
    finishTargetRender(displayedShows);
    return;
  }

  const fragment = document.createDocumentFragment();
  displayedShows.forEach((show, index) => fragment.appendChild(createShowCard(show, index)));
  showsList.appendChild(fragment);
  finishTargetRender(displayedShows);
}

function renderUnavailableState() {
  if (showCount) {
    showCount.textContent = "";
  }

  if (tourFinder) {
    tourFinder.hidden = true;
  }

  if (widgetFooter) {
    widgetFooter.hidden = true;
  }

  renderMessage("error-state", "Show data unavailable", copy.upcoming.emptyText, {
    label: "Sign Up",
    url: streetTeamSignupUrl,
    imageUrl: buttonIcons.signUp,
  });
}

function renderMyspaceUpcomingShows(shows) {
  const fragment = document.createDocumentFragment();
  shows.forEach((show, index) => fragment.appendChild(createMyspaceShowCard(show, index)));
  showsList.appendChild(fragment);
}

function createMyspaceShowCard(show, index) {
  const card = document.createElement("article");
  const showDate = parseLocalDate(show.date);
  const location = [show.city, show.region].filter(Boolean).join(", ") || show.country || "Location TBA";
  const timeText = formatTimes(show);
  const primaryUrl = show.ticketUrl || show.infoUrl || createDirectionsUrl(show);

  card.className = index === 0 && !hasActiveTarget() ? "myspace-show-card myspace-show-card--next" : "myspace-show-card";
  decorateTargetCard(card, show);

  const avatarColumn = document.createElement("div");
  avatarColumn.className = "myspace-show-avatar";

  const avatar = document.createElement("img");
  avatar.src = `${rootPath}/assets/oathbound-profile-dsc03045-web.jpg`;
  avatar.alt = "";
  avatar.loading = "lazy";
  avatarColumn.appendChild(avatar);

  const avatarName = document.createElement("span");
  avatarName.textContent = "Oathbound Shows";
  avatarColumn.appendChild(avatarName);

  const body = document.createElement("div");
  body.className = "myspace-show-body";

  const title = document.createElement("h3");
  if (primaryUrl) {
    const titleLink = document.createElement("a");
    titleLink.href = primaryUrl;
    titleLink.textContent = `${location} / ${show.venue || "Venue TBA"}`;
    if (primaryUrl.startsWith("http")) {
      titleLink.target = "_blank";
      titleLink.rel = "noopener noreferrer";
    }
    title.appendChild(titleLink);
  } else {
    title.textContent = `${location} / ${show.venue || "Venue TBA"}`;
  }
  appendDistanceBadge(title, show);

  const details = document.createElement("div");
  details.className = "myspace-show-details";

  const dateLine = document.createElement("p");
  dateLine.innerHTML = `<strong>Date:</strong> ${formatLongDate(showDate)}`;
  details.appendChild(dateLine);

  if (timeText) {
    const timeLine = document.createElement("p");
    timeLine.innerHTML = `<strong>Time:</strong> ${timeText}`;
    details.appendChild(timeLine);
  }

  if (show.venue) {
    const venueLine = document.createElement("p");
    venueLine.innerHTML = `<strong>Venue:</strong> ${escapeHtml(show.venue)}`;
    details.appendChild(venueLine);
  }

  if (show.lineup) {
    const lineup = document.createElement("p");
    lineup.innerHTML = `<strong>Lineup:</strong> ${escapeHtml(formatLineup(show.lineup))}`;
    details.appendChild(lineup);
  }

  const notes = createMyspaceDescription(show.notes || "Pretty Suspect and Oathbound are bringing the Myspace Tour through town. Expect a loud, sweaty, full-send night of heavy hooks, sharp edges, and scene-era chaos.");

  const badges = document.createElement("div");
  badges.className = "myspace-show-badges";
  renderMyspaceBadges(badges, show);

  const actions = document.createElement("div");
  actions.className = "myspace-show-actions";

  if (show.ticketUrl) {
    actions.appendChild(createButton(show.ticketUrl, show.ticketLabel || "Tickets", true, "ticket", show, index));
  }

  if (show.infoUrl) {
    actions.appendChild(createButton(show.infoUrl, show.infoLabel || "Details", false, "details", show, index));
  }

  const directionsUrl = createDirectionsUrl(show);
  if (directionsUrl) {
    actions.appendChild(createButton(directionsUrl, "Map It", false, "directions", show, index));
  }

  body.append(title, details, notes);
  if (badges.children.length) {
    body.appendChild(badges);
  }
  if (actions.children.length) {
    body.appendChild(actions);
  }

  card.append(avatarColumn, body);
  window.oathboundAnalytics?.decorateShowCard(card, show, index);
  return card;
}

function renderTourFriends() {
  const container = document.querySelector("#tour-friends-list");

  if (!container) {
    return;
  }

  const friends = [
    { name: "Pretty Suspect", image: "assets/top8-pretty-suspect.webp", url: "https://linktr.ee/prettysuspect" },
    { name: "Cosmic Waste", image: "assets/top8-cosmic-waste.webp", url: "https://www.cosmicwaste.net/" },
    { name: "Hide Heaven", image: "assets/top8-hide-heaven.webp", url: "https://www.instagram.com/hideheaven541/" },
    { name: "Drawn by Knives", image: "assets/top8-drawn-by-knives.webp", url: "https://drawnbyknives.com/" },
    { name: "Dead Nexus", image: "assets/top8-dead-nexus.webp", url: "https://www.facebook.com/deadnexus/" },
    { name: "Hallway Scenes", image: "assets/top8-hallway-scenes.webp", url: "https://www.hallwayscenes.com/" },
    { name: "Revelry", image: "assets/top8-revelry.webp", url: "https://linktr.ee/revelryca" },
    { name: "Foghorn", image: "assets/top8-foghorn.webp", url: "https://www.instagram.com/officialfoghorn/" },
  ];
  container.innerHTML = "";

  friends.forEach((friend) => {
    const tile = document.createElement("a");
    tile.className = `tour-friend tour-friend--${createFriendSlug(friend.name)}`;
    tile.href = friend.url;
    tile.setAttribute("aria-label", friend.name);

    const media = document.createElement("span");
    media.className = "tour-friend-media";

    if (friend.image) {
      const image = document.createElement("img");
      image.src = `${rootPath}/${friend.image}`;
      image.alt = "";
      image.loading = "lazy";
      media.appendChild(image);
    } else {
      media.textContent = getFriendTileText(friend.name);
    }

    const label = document.createElement("p");
    label.textContent = friend.name;

    tile.append(media, label);
    container.appendChild(tile);
  });
}

function renderPastShowsByYear(shows) {
  const currentYear = new Date().getFullYear();
  const groups = groupShowsByYear(shows);
  const fragment = document.createDocumentFragment();

  groups.forEach(([year, yearShows]) => {
    const details = document.createElement("details");
    details.className = "year-accordion";

    if (Number(year) === currentYear) {
      details.open = true;
    }
    details.addEventListener("toggle", () => {
      window.oathboundAnalytics?.trackPastYearToggle(year, details.open, yearShows.length);
    });

    const summary = document.createElement("summary");
    summary.className = "year-summary";
    summary.innerHTML = `
      <span>${year}</span>
      <span>${yearShows.length} ${yearShows.length === 1 ? "show" : "shows"}</span>
    `;

    const list = document.createElement("div");
    list.className = "year-shows";
    yearShows.forEach((show) => list.appendChild(createShowCard(show, -1)));

    details.append(summary, list);
    fragment.appendChild(details);
  });

  showsList.appendChild(fragment);
}

function groupShowsByYear(shows) {
  const groups = new Map();

  shows.forEach((show) => {
    const year = formatYear(parseLocalDate(show.date));
    const yearShows = groups.get(year) || [];
    yearShows.push(show);
    groups.set(year, yearShows);
  });

  return Array.from(groups.entries());
}

function createShowCard(show, index) {
  const card = template.content.firstElementChild.cloneNode(true);
  const showDate = parseLocalDate(show.date);
  const location = [show.city, show.region].filter(Boolean).join(", ") || show.country || "Location TBA";
  const timeText = formatTimes(show);
  decorateTargetCard(card, show);

  const dateElement = card.querySelector(".show-date");
  if (dateElement) {
    dateElement.setAttribute("datetime", show.date);
  }

  setText(card, ".show-month", formatMonth(showDate));
  setText(card, ".show-day", formatDay(showDate));
  setText(card, ".show-year", formatYear(showDate));
  setText(card, ".show-location", location);
  setText(card, ".show-venue", show.venue || "Venue TBA");
  setText(card, ".show-time", [formatLongDate(showDate), timeText].filter(Boolean).join(" / "));
  setText(card, ".show-lineup", show.lineup || "");
  setText(card, ".show-notes", show.notes || "");
  appendDistanceBadge(card.querySelector(".show-location"), show);

  renderShowStatus(card, showDate, index);
  renderShowFlags(card.querySelector(".show-flags"), show);
  renderIconBadges(card.querySelector(".show-age"), show);
  toggleElement(card.querySelector(".show-lineup"), Boolean(show.lineup && show.lineup.trim()));
  toggleElement(card.querySelector(".show-notes"), Boolean(show.notes && show.notes.trim()));

  const actions = card.querySelector(".show-actions");
  if (!actions) {
    return card;
  }

  if (pageMode !== "past" && show.ticketUrl) {
    actions.appendChild(createButton(show.ticketUrl, show.ticketLabel || "Tickets", true, "ticket", show, index));
  }

  if (show.infoUrl) {
    actions.appendChild(createButton(show.infoUrl, show.infoLabel || "Details", false, "details", show, index));
  }

  const directionsUrl = pageMode === "past" || !showDirections ? "" : createDirectionsUrl(show);
  if (directionsUrl) {
    actions.appendChild(createButton(directionsUrl, "Directions", false, "directions", show, index));
  }

  window.oathboundAnalytics?.decorateShowCard(card, show, index);
  return card;
}

function renderShowStatus(card, showDate, index) {
  const status = card.querySelector(".show-status");

  if (!status) {
    return;
  }

  if (pageMode !== "upcoming" || index !== 0 || hasActiveTarget()) {
    status.remove();
    return;
  }

  card.classList.add("show-card--next");
  const detail = formatNextShowDetail(showDate);
  status.textContent = detail ? `Next Show • ${detail}` : "Next Show";
}

function renderShowFlags(container, show) {
  if (!container) {
    return;
  }

  const chips = getTicketStatusChips(show);

  if (!chips.length) {
    container.remove();
    return;
  }

  chips.forEach((chip) => {
    const badge = document.createElement("span");
    badge.className = chip.className;
    badge.textContent = chip.label;
    container.appendChild(badge);
  });
}

function createButton(url, label, isPrimary = false, actionType = "details", show = null, index = 0) {
  const button = document.createElement("a");
  button.className = isPrimary ? "button button--primary" : "button";
  button.href = url;
  button.textContent = label;

  if (url.startsWith("http")) {
    button.target = "_blank";
    button.rel = "noopener noreferrer";
  }

  window.oathboundAnalytics?.decorateShowLink(button, show, actionType, index);
  return button;
}

function renderIconBadges(container, show, extraClassName = "") {
  if (!container) {
    return;
  }

  const badges = getShowIconBadges(show);

  if (!badges.length) {
    container.remove();
    return;
  }

  badges.forEach((badge) => {
    if (badge.src) {
      container.appendChild(createImageBadge(badge.src, badge.label, badge.className, extraClassName));
      return;
    }

    const fallback = document.createElement("span");
    fallback.className = [badge.className, extraClassName].filter(Boolean).join(" ");
    fallback.textContent = badge.label;
    container.appendChild(fallback);
  });
}

function renderMyspaceBadges(container, show) {
  if (!container) {
    return;
  }

  const badges = getShowTextBadges(show);

  if (!badges.length) {
    container.remove();
    return;
  }

  badges.forEach((label) => {
    const badge = document.createElement("span");
    badge.className = label === getDoorSalesOnlyLabel(show)
      ? "myspace-age-badge myspace-age-badge--door-sales"
      : "myspace-age-badge";
    badge.textContent = label;
    container.appendChild(badge);
  });
}

function getShowTextBadges(show) {
  const badges = [];
  const age = normalizeAgeRestriction(show.ageRestriction);

  if (age) {
    badges.push(age);
  }

  getShowStatusIconBadges(show).forEach((badge) => {
    if (badge.label && !badges.includes(badge.label)) {
      badges.push(badge.label);
    }
  });

  getTicketStatusChips(show).forEach((chip) => {
    if (chip.label && !badges.includes(chip.label)) {
      badges.push(chip.label);
    }
  });

  return badges;
}

function getShowIconBadges(show) {
  const badges = [];
  const age = normalizeAgeRestriction(show.ageRestriction);

  if (age === "21+") {
    badges.push({
      src: "assets/icons/300x300/21-300x300.png",
      label: "21+",
      className: "age-image-badge",
    });
  } else if (age === "All Ages") {
    badges.push({
      src: "assets/icons/300x300/all-ages-300x300.png",
      label: "All Ages",
      className: "age-image-badge",
    });
  } else if (age) {
    badges.push({
      label: age,
      className: "age-text-badge",
    });
  }

  badges.push(...getShowStatusIconBadges(show));
  return badges;
}

function getTicketStatusChips(show) {
  if (!isDoorSalesOnly(show)) {
    return [];
  }

  return [{
    label: getDoorSalesOnlyLabel(show),
    className: "status-chip status-chip--door-sales",
  }];
}

function isDoorSalesOnly(show) {
  if (show.doorSalesOnly === true) {
    return true;
  }

  const status = normalizeBadgeText(show.ticketStatus);
  return status === "door-sales-only" || status === "door sales only";
}

function getDoorSalesOnlyLabel(show) {
  return String(show.ticketDisplayLabel || "").trim() || "Door sales only";
}

function getShowStatusIconBadges(show) {
  const status = normalizeBadgeText(show.status);
  const badges = [];

  if (status.includes("cancel")) {
    badges.push({
      src: "assets/icons/90x90/canceled-90x90.png",
      label: "Cancelled",
      className: "status-image-badge status-image-badge--cancelled",
    });
  }

  if (status.includes("new date") || status.includes("new-date") || status.includes("resched")) {
    badges.push({
      src: "assets/icons/90x90/new-date-90x90.png",
      label: "New Date",
      className: "status-image-badge status-image-badge--new-date",
    });
  }

  if (status.includes("relocat") || status.includes("moved")) {
    badges.push({
      src: "assets/icons/90x90/relocated-90x90.png",
      label: "Relocated",
      className: "status-image-badge status-image-badge--relocated",
    });
  }

  if (isFreeShow(show)) {
    badges.push({
      src: "assets/icons/90x90/free-show-90x90.png",
      label: "Free Show",
      className: "status-image-badge status-image-badge--free-show",
    });
  }

  return badges;
}

function isFreeShow(show) {
  const text = normalizeBadgeText([
    show.status,
    show.ticketLabel,
    show.ticketUrl,
    show.infoLabel,
    show.notes,
  ].filter(Boolean).join(" "));

  return text.includes("free-show") || /\bfree\b/.test(text);
}

function normalizeBadgeText(value = "") {
  return value.toString().trim().toLowerCase();
}

function createImageBadge(src, label, className = "age-image-badge", extraClassName = "") {
  const image = document.createElement("img");
  image.className = [className, extraClassName].filter(Boolean).join(" ");
  image.src = `${rootPath}/${src}`;
  image.alt = label;
  image.title = label;
  image.loading = "lazy";
  return image;
}

function normalizeAgeRestriction(ageRestriction = "") {
  const normalized = ageRestriction.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "21+" || normalized.includes("21")) {
    return "21+";
  }

  if (normalized === "18+" || normalized.includes("18")) {
    return "18+";
  }

  if (normalized === "all ages" || normalized === "all-ages" || normalized === "aa") {
    return "All Ages";
  }

  return ageRestriction.trim();
}

function createDirectionsUrl(show) {
  const venue = show.venue && !/tba/i.test(show.venue) ? show.venue : "";
  const location = [show.city, show.region, show.country].filter(Boolean).join(", ");
  const query = show.address
    ? [show.address, venue, location].filter(Boolean).join(", ")
    : [venue, location].filter(Boolean).join(", ");

  if (!query) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function renderMessage(className, title, text, action = null) {
  showsList.innerHTML = `
    <div class="${className}">
      <h3>${title}</h3>
      <p>${text}</p>
      ${action ? `<a class="prismatic-button prismatic-button--join empty-state__button" href="${action.url}" aria-label="${action.label}" target="_blank" rel="noopener noreferrer"><img src="${action.imageUrl}" alt="${action.label}"></a>` : ""}
    </div>
  `;
}

function setText(container, selector, value) {
  const element = container.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function toggleElement(element, shouldShow) {
  if (!element) {
    return;
  }

  if (shouldShow) {
    element.hidden = false;
    return;
  }

  element.hidden = true;
}

function createMyspaceDescription(text) {
  const paragraph = document.createElement("p");
  const label = document.createElement("strong");
  const textNode = document.createTextNode("");
  const toggle = document.createElement("button");
  const fullText = text.trim();
  const shortText = shortenPostText(fullText);
  const isShortened = shortText !== fullText;

  paragraph.className = "myspace-show-description";
  label.textContent = "Description:";
  paragraph.append(label, document.createTextNode(" "), textNode);

  if (!isShortened) {
    textNode.textContent = fullText;
    return paragraph;
  }

  toggle.type = "button";
  toggle.className = "myspace-show-more";
  toggle.textContent = "Show more";
  toggle.setAttribute("aria-expanded", "false");

  const setExpanded = (isExpanded) => {
    textNode.textContent = isExpanded ? fullText : `${shortText} `;
    toggle.textContent = isExpanded ? "Show less" : "Show more";
    toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  };

  toggle.addEventListener("click", () => {
    setExpanded(toggle.getAttribute("aria-expanded") !== "true");
  });

  setExpanded(false);
  paragraph.appendChild(toggle);
  return paragraph;
}

function shortenPostText(text) {
  const trimmed = text.trim();

  if (trimmed.length <= 260) {
    return trimmed;
  }

  return `${trimmed.slice(0, 257).trim()}...`;
}

function formatLineup(lineup = "") {
  return lineup
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function createFriendInitials(label) {
  return label
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getFriendTileText(label) {
  const stylized = {
    "Pretty Suspect": "Pretty Suspect",
    "Cosmic Waste": "Cosmic Waste",
    "Hide Heaven": "Hide Heaven",
    "Drawn by Knives": "Drawn by Knives",
    "Dead Nexus": "Dead Nexus",
    "Revelry": "Revelry",
    "Hallway Scenes": "Hallway Scenes",
    "Foghorn": "Foghorn",
  };

  return stylized[label] || createFriendInitials(label);
}

function createFriendSlug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[character]));
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isToday(date) {
  const today = new Date();

  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function formatNextShowDetail(showDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(showDate);
  target.setHours(0, 0, 0, 0);

  const dayDifference = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (dayDifference < 0) {
    return "";
  }

  if (dayDifference === 0) {
    return "Tonight";
  }

  if (dayDifference === 1) {
    return "Tomorrow";
  }

  if (dayDifference === 2) {
    return "In 2 days";
  }

  if (dayDifference < 7) {
    return `This ${formatWeekday(target)}`;
  }

  if (dayDifference <= 13) {
    return `Next ${formatWeekday(target)}`;
  }

  if (dayDifference < 28) {
    const weekDifference = Math.round(dayDifference / 7);
    return `In ${weekDifference} weeks`;
  }

  const monthDifference = getMonthDifference(today, target);

  if (monthDifference === 1) {
    return "Next month";
  }

  if (monthDifference > 1 && monthDifference <= 11) {
    return `In ${monthDifference} months`;
  }

  return target.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatWeekday(date) {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function getMonthDifference(start, end) {
  const monthDifference = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();

  if (end.getDate() < start.getDate()) {
    return Math.max(0, monthDifference);
  }

  return monthDifference || 1;
}

function formatMonth(date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function formatDay(date) {
  return date.toLocaleDateString("en-US", { day: "2-digit" });
}

function formatYear(date) {
  return date.toLocaleDateString("en-US", { year: "numeric" });
}

function formatLongDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  return show.time ? formatTime(show.time) : "";
}

function formatTime(value) {
  const trimmed = value.trim();
  const standardMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const militaryMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (standardMatch) {
    const [, hour, minutes = "00", meridiem] = standardMatch;
    return `${Number(hour)}:${minutes} ${meridiem.toUpperCase()}`;
  }

  if (!militaryMatch) {
    return trimmed;
  }

  const [, hourValue, minutes] = militaryMatch;
  const hour = Number(hourValue);
  const meridiem = hour >= 12 ? "PM" : "AM";
  const standardHour = hour % 12 || 12;

  return `${standardHour}:${minutes} ${meridiem}`;
}
