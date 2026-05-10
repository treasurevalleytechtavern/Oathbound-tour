const pageMode = document.body.dataset.page === "past" ? "past" : "upcoming";
const rootPath = document.body.dataset.root || ".";
const rawShowLimit = Number(document.body.dataset.showLimit || 0);
const showLimit = Number.isFinite(rawShowLimit) && rawShowLimit > 0 ? rawShowLimit : 0;
const showDirections = document.body.dataset.showDirections !== "false";
const showsList = document.querySelector("#shows-list");
const showCount = document.querySelector("#show-count");
const template = document.querySelector("#show-card-template");
const widgetFooter = document.querySelector(".widget-footer");

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
    showCount.textContent = hasMoreShows
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

  const fragment = document.createDocumentFragment();
  displayedShows.forEach((show, index) => fragment.appendChild(createShowCard(show, index)));
  showsList.appendChild(fragment);
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

  card.querySelector(".show-date").setAttribute("datetime", show.date);
  card.querySelector(".show-month").textContent = formatMonth(showDate);
  card.querySelector(".show-day").textContent = formatDay(showDate);
  card.querySelector(".show-year").textContent = formatYear(showDate);
  card.querySelector(".show-location").textContent = location;
  card.querySelector(".show-venue").textContent = show.venue || "Venue TBA";
  card.querySelector(".show-time").textContent = [formatLongDate(showDate), timeText].filter(Boolean).join(" / ");
  card.querySelector(".show-lineup").textContent = show.lineup || "";
  card.querySelector(".show-notes").textContent = show.notes || "";

  renderShowStatus(card, showDate, index);
  renderStatusChip(card.querySelector(".show-flags"), show.status);
  renderAgeBadge(card.querySelector(".show-age"), show.ageRestriction);

  const actions = card.querySelector(".show-actions");
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

  if (pageMode !== "upcoming" || index !== 0) {
    status.remove();
    return;
  }

  card.classList.add("show-card--next");
  const detail = formatNextShowDetail(showDate);
  status.textContent = detail ? `Next Show • ${detail}` : "Next Show";
}

function renderStatusChip(container, rawStatus = "") {
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
