const OATHBOUND_GA_MEASUREMENT_ID = "G-EZQ2J0R6SS";

(() => {
  const pageMode = document.body?.dataset.page || "unknown";
  const isWidget = document.body?.dataset.widget === "compact";
  const tourTheme = document.documentElement.dataset.tourTheme || "standard";
  const isMyspaceActive = tourTheme === "myspace";
  const viewedShowCards = new WeakSet();
  const showCardObserver = createShowCardObserver();

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", OATHBOUND_GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_path: window.location.pathname + window.location.search,
    content_group: getContentGroup(),
    page_mode: pageMode,
    tour_theme: tourTheme,
    tour_theme_active: isMyspaceActive,
    is_widget: isWidget,
  });

  loadGoogleTag();

  window.oathboundAnalytics = {
    trackEvent,
    trackShowList,
    decorateShowCard,
    decorateShowLink,
    trackPastYearToggle,
    trackMyspaceAudio,
  };

  document.addEventListener("DOMContentLoaded", () => {
    trackEvent("tour_page_context", {
      content_group: getContentGroup(),
    });

    if (isMyspaceActive) {
      trackEvent("myspace_theme_view", {
        campaign_name: "myspace_tour_2026",
        active_window: "2026-05-22_to_2026-06-29",
      });
    }

    document.querySelectorAll("a").forEach(decorateGenericLink);
  });

  function loadGoogleTag() {
    if (document.querySelector(`script[src*="${OATHBOUND_GA_MEASUREMENT_ID}"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(OATHBOUND_GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);
  }

  function trackEvent(eventName, params = {}) {
    if (typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", eventName, cleanParams({
      page_mode: pageMode,
      tour_theme: tourTheme,
      tour_theme_active: isMyspaceActive,
      is_widget: isWidget,
      ...params,
    }));
  }

  function trackShowList(shows = [], listName = getContentGroup()) {
    const items = shows.slice(0, 20).map((show, index) => ({
      item_id: createShowId(show),
      item_name: show.venue || "Venue TBA",
      item_category: pageMode === "past" ? "past_show" : "upcoming_show",
      item_category2: isMyspaceActive ? "myspace_tour" : "standard_tour",
      item_list_name: listName,
      index: index + 1,
      location_id: [show.city, show.region, show.country].filter(Boolean).join(", "),
    }));

    trackEvent("show_list_view", {
      content_group: listName,
      show_count: shows.length,
      first_show_date: shows[0]?.date || "",
      first_show_venue: shows[0]?.venue || "",
    });

    if (items.length) {
      trackEvent("view_item_list", {
        item_list_name: listName,
        items,
      });
    }
  }

  function decorateShowCard(card, show, index) {
    if (!card || !show) {
      return;
    }

    Object.entries(getShowParams(show, index)).forEach(([key, value]) => {
      card.setAttribute(`data-${key.replace(/_/g, "-")}`, String(value));
    });

    if (showCardObserver) {
      showCardObserver.observe(card);
      return;
    }

    trackShowCardView(card);
  }

  function decorateShowLink(link, show, actionType, index) {
    if (!link || !show) {
      return;
    }

    link.dataset.analyticsDecorated = "show";
    link.dataset.analyticsAction = actionType;
    link.addEventListener("click", () => {
      trackEvent("show_link_click", {
        action_type: actionType,
        link_text: link.textContent.trim(),
        link_url: link.href,
        outbound: isOutboundUrl(link.href),
        ...getShowParams(show, index),
      });
    });
  }

  function trackPastYearToggle(year, isOpen, showCount) {
    trackEvent("past_year_toggle", {
      archive_year: year,
      toggle_state: isOpen ? "open" : "closed",
      show_count: showCount,
    });
  }

  function trackMyspaceAudio(action, extraParams = {}) {
    trackEvent("myspace_audio", {
      audio_title: "Set Adrift",
      action_type: action,
      ...extraParams,
    });
  }

  function decorateGenericLink(link) {
    if (!link || link.dataset.analyticsDecorated) {
      return;
    }

    link.dataset.analyticsDecorated = "generic";
    link.addEventListener("click", () => {
      trackEvent("link_click", {
        link_text: link.textContent.trim(),
        link_url: link.href,
        outbound: isOutboundUrl(link.href),
      });
    });
  }

  function createShowCardObserver() {
    if (!("IntersectionObserver" in window)) {
      return null;
    }

    return new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
          return;
        }

        trackShowCardView(entry.target);
        showCardObserver.unobserve(entry.target);
      });
    }, { threshold: [0.5] });
  }

  function trackShowCardView(card) {
    if (viewedShowCards.has(card)) {
      return;
    }

    viewedShowCards.add(card);
    trackEvent("show_card_view", {
      show_date: card.dataset.showDate,
      show_venue: card.dataset.showVenue,
      show_city: card.dataset.showCity,
      show_region: card.dataset.showRegion,
      show_country: card.dataset.showCountry,
      show_index: Number(card.dataset.showIndex || 0),
      show_is_next: card.dataset.showIsNext === "true",
      show_has_tickets: card.dataset.showHasTickets === "true",
    });
  }

  function getShowParams(show, index = 0) {
    return {
      show_date: show.date || "",
      show_venue: truncate(show.venue || "Venue TBA"),
      show_city: truncate(show.city || ""),
      show_region: truncate(show.region || ""),
      show_country: truncate(show.country || ""),
      show_status: truncate(show.status || ""),
      show_age: truncate(show.ageRestriction || ""),
      show_index: index + 1,
      show_is_next: pageMode === "upcoming" && index === 0,
      show_has_tickets: Boolean(show.ticketUrl),
    };
  }

  function createShowId(show) {
    return [show.date, show.venue, show.city, show.region]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function getContentGroup() {
    if (isWidget) {
      return "tour_widget";
    }

    if (pageMode === "past") {
      return "past_shows";
    }

    if (pageMode === "street-team") {
      return "street_team";
    }

    return isMyspaceActive ? "myspace_tour" : "upcoming_tour";
  }

  function isOutboundUrl(url) {
    try {
      return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  function cleanParams(params) {
    return Object.fromEntries(Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, typeof value === "string" ? truncate(value) : value]));
  }

  function truncate(value) {
    return value.length > 100 ? `${value.slice(0, 97)}...` : value;
  }
})();
