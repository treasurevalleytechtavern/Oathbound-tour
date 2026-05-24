const pageMode = document.body.dataset.page === "past" ? "past" : "upcoming";
const rootPath = document.body.dataset.root || ".";
const rawShowLimit = Number(document.body.dataset.showLimit || 0);
const showLimit = Number.isFinite(rawShowLimit) && rawShowLimit > 0 ? rawShowLimit : 0;
const showDirections = document.body.dataset.showDirections !== "false";
const showsList = document.querySelector("#shows-list");
const showCount = document.querySelector("#show-count");
const template = document.querySelector("#show-card-template");
const widgetFooter = document.querySelector(".widget-footer");
const isMyspaceTheme = document.documentElement.classList.contains("myspace-theme")
  && document.body.dataset.page === "upcoming";

const copy = {
  upcoming: {
    emptyTitle: "No upcoming shows listed",
    emptyText: "Check back soon. New dates will land here when they are announced.",
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

loadShows();

async function loadShows() {
  try {
    const response = await fetch(`${rootPath}/data/shows.json`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load show data: ${response.status}`);
    }

    const shows = await response.json();
    const filteredShows = filterShows(shows, pageMode);
    renderShows(filteredShows);
  } catch (error) {
    if (isMyspaceTheme) {
      renderTourFriends();
    }

    renderMessage("error-state", "Show data unavailable", "The show list could not be loaded. Check data/shows.json and try again.");
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

function renderShows(shows) {
  showsList.innerHTML = "";
  const displayedShows = showLimit && pageMode === "upcoming" ? shows.slice(0, showLimit) : shows;
  const hasMoreShows = showLimit && pageMode === "upcoming" && shows.length > displayedShows.length;

  if (showCount) {
    showCount.textContent = isMyspaceTheme
      ? `${displayedShows.length} bulletins`
      : hasMoreShows
        ? `Next ${displayedShows.length} of ${shows.length} upcoming shows`
        : copy[pageMode].countLabel(displayedShows.length);
  }

  if (widgetFooter) {
    widgetFooter.hidden = !hasMoreShows;
  }

  if (!displayedShows.length) {
    renderMessage("empty-state", copy[pageMode].emptyTitle, copy[pageMode].emptyText);
    return;
  }

  if (pageMode === "past") {
    renderPastShowsByYear(displayedShows);
    return;
  }

  if (isMyspaceTheme) {
    renderMyspaceTourWall(displayedShows);
    renderTourFriends(displayedShows);
    return;
  }

  const fragment = document.createDocumentFragment();
  displayedShows.forEach((show, index) => fragment.appendChild(createShowCard(show, index)));
  showsList.appendChild(fragment);
}

function renderMyspaceTourWall(shows) {
  const fragment = document.createDocumentFragment();
  shows.forEach((show, index) => fragment.appendChild(createMyspacePost(show, index)));
  showsList.appendChild(fragment);
}

function createMyspacePost(show, index) {
  const post = document.createElement("article");
  const showDate = parseLocalDate(show.date);
  const location = [show.city, show.region].filter(Boolean).join(", ") || show.country || "Location TBA";
  const timeText = formatTimes(show);

  post.className = index === 0 ? "myspace-post myspace-post--next" : "myspace-post";

  const avatarColumn = document.createElement("div");
  avatarColumn.className = "myspace-post-avatar";

  const avatar = document.createElement("img");
  avatar.src = `${rootPath}/assets/oathbound-profile-dsc03045-web.jpg`;
  avatar.alt = "";
  avatar.loading = "lazy";
  avatarColumn.appendChild(avatar);

  const avatarName = document.createElement("span");
  avatarName.textContent = index % 2 === 0 ? "Oathbound" : "Pretty Suspect";
  avatarColumn.appendChild(avatarName);

  const body = document.createElement("div");
  body.className = "myspace-post-body";

  const kicker = document.createElement("p");
  kicker.className = "myspace-post-kicker";
  kicker.textContent = index === 0
    ? "Oathbound posted a bulletin"
    : index % 2 === 0
      ? "New show added"
      : "Pretty Suspect left a comment";

  const title = document.createElement("h3");
  title.textContent = `${location} / ${show.venue || "Venue TBA"}`;

  const timestamp = document.createElement("p");
  timestamp.className = "myspace-post-time";
  timestamp.textContent = `Posted ${formatLongDate(showDate)} at 3:33 PM`;

  const details = document.createElement("div");
  details.className = "myspace-post-details";

  const dateLine = document.createElement("p");
  dateLine.innerHTML = `<strong>Date:</strong> ${formatLongDate(showDate)}`;
  details.appendChild(dateLine);

  if (timeText) {
    const timeLine = document.createElement("p");
    timeLine.innerHTML = `<strong>Time:</strong> ${timeText}`;
    details.appendChild(timeLine);
  }

  if (show.lineup) {
    const lineup = document.createElement("p");
    lineup.innerHTML = `<strong>Lineup:</strong> ${escapeHtml(show.lineup)}`;
    details.appendChild(lineup);
  }

  const notes = document.createElement("p");
  notes.className = "myspace-post-notes";
  notes.textContent = shortenPostText(show.notes || "Tour stop details are waking up from dial-up sleep. Check the links and pull up loud.");

  const badges = document.createElement("div");
  badges.className = "myspace-post-badges";
  const age = normalizeAgeRestriction(show.ageRestriction);
  if (age) {
    const ageBadge = document.createElement("span");
    ageBadge.className = "myspace-age-badge";
    ageBadge.textContent = age;
    badges.appendChild(ageBadge);
  }

  const actions = document.createElement("div");
  actions.className = "myspace-post-actions";

  if (show.ticketUrl) {
    actions.appendChild(createButton(show.ticketUrl, show.ticketLabel || "Tickets", true));
  }

  if (show.infoUrl) {
    actions.appendChild(createButton(show.infoUrl, show.infoLabel || "Details"));
  }

  const directionsUrl = createDirectionsUrl(show);
  if (directionsUrl) {
    actions.appendChild(createButton(directionsUrl, "Map It"));
  }

  body.append(kicker, title, timestamp, details, notes);
  if (badges.children.length) {
    body.appendChild(badges);
  }
  if (actions.children.length) {
    body.appendChild(actions);
  }

  post.append(avatarColumn, body);
  return post;
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

  renderShowStatus(card, showDate, index);
  renderStatusChip(card.querySelector(".show-flags"), show.status);
  renderAgeBadge(card.querySelector(".show-age"), show.ageRestriction);
  toggleElement(card.querySelector(".show-lineup"), Boolean(show.lineup && show.lineup.trim()));
  toggleElement(card.querySelector(".show-notes"), Boolean(show.notes && show.notes.trim()));

  const actions = card.querySelector(".show-actions");
  if (!actions) {
    return card;
  }

  if (pageMode !== "past" && show.ticketUrl) {
    actions.appendChild(createButton(show.ticketUrl, show.ticketLabel || "Tickets", true));
  }

  if (show.infoUrl) {
    actions.appendChild(createButton(show.infoUrl, show.infoLabel || "Details"));
  }

  const directionsUrl = pageMode === "past" || !showDirections ? "" : createDirectionsUrl(show);
  if (directionsUrl) {
    actions.appendChild(createButton(directionsUrl, "Directions"));
  }

  return card;
}

function renderShowStatus(card, showDate, index) {
  const status = card.querySelector(".show-status");

  if (!status) {
    return;
  }

  if (pageMode !== "upcoming" || index !== 0) {
    status.remove();
    return;
  }

  card.classList.add("show-card--next");
  const detail = formatNextShowDetail(showDate);
  status.textContent = detail ? `Next Show • ${detail}` : "Next Show";
}

function renderStatusChip(container, rawStatus = "") {
  if (!container) {
    return;
  }

  const normalized = normalizeShowStatus(rawStatus);

  if (!normalized) {
    container.remove();
    return;
  }

  const chip = document.createElement("span");
  chip.className = `status-chip status-chip--${normalized.key}`;
  chip.textContent = normalized.label;
  container.appendChild(chip);
}

function createButton(url, label, isPrimary = false) {
  const button = document.createElement("a");
  button.className = isPrimary ? "button button--primary" : "button";
  button.href = url;
  button.textContent = label;

  if (url.startsWith("http")) {
    button.target = "_blank";
    button.rel = "noopener noreferrer";
  }

  return button;
}

function renderAgeBadge(container, ageRestriction) {
  if (!container) {
    return;
  }

  const normalized = normalizeAgeRestriction(ageRestriction);

  if (!normalized) {
    container.remove();
    return;
  }

  if (normalized === "21+") {
    container.appendChild(createImageBadge("assets/age-21-plus.png", "21+"));
    return;
  }

  if (normalized === "All Ages") {
    container.appendChild(createImageBadge("assets/age-all-ages.png", "All Ages"));
    return;
  }

  const fallback = document.createElement("span");
  fallback.className = "age-text-badge";
  fallback.textContent = normalized;
  container.appendChild(fallback);
}

function createImageBadge(src, label) {
  const image = document.createElement("img");
  image.className = "age-image-badge";
  image.src = `${rootPath}/${src}`;
  image.alt = label;
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

function normalizeShowStatus(status = "") {
  const normalized = status.trim().toLowerCase();

  if (!normalized) {
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

function renderMessage(className, title, text) {
  showsList.innerHTML = `
    <div class="${className}">
      <h3>${title}</h3>
      <p>${text}</p>
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

function shortenPostText(text) {
  const trimmed = text.trim();

  if (trimmed.length <= 260) {
    return trimmed;
  }

  return `${trimmed.slice(0, 257).trim()}...`;
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
