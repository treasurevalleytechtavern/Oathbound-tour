const pageMode = document.body.dataset.page === "past" ? "past" : "upcoming";
const rootPath = document.body.dataset.root || ".";
const showsList = document.querySelector("#shows-list");
const showCount = document.querySelector("#show-count");
const template = document.querySelector("#show-card-template");

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
  showCount.textContent = copy[pageMode].countLabel(shows.length);

  if (!shows.length) {
    renderMessage("empty-state", copy[pageMode].emptyTitle, copy[pageMode].emptyText);
    return;
  }

  const fragment = document.createDocumentFragment();
  shows.forEach((show) => fragment.appendChild(createShowCard(show)));
  showsList.appendChild(fragment);
}

function createShowCard(show) {
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

  renderAgeBadge(card.querySelector(".show-age"), show.ageRestriction);

  const actions = card.querySelector(".show-actions");
  if (show.ticketUrl) {
    actions.appendChild(createButton(show.ticketUrl, show.ticketLabel || "Tickets"));
  }

  if (show.infoUrl) {
    actions.appendChild(createButton(show.infoUrl, show.infoLabel || "Details"));
  }

  const directionsUrl = createDirectionsUrl(show);
  if (directionsUrl) {
    actions.appendChild(createButton(directionsUrl, "Directions"));
  }

  return card;
}

function createButton(url, label) {
  const button = document.createElement("a");
  button.className = "button";
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
