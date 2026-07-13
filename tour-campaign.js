(() => {
  const rootPath = document.body?.dataset.root || ".";
  const campaignUrl = `${rootPath}/data/tour-campaigns.json`;

  window.oathboundActiveTourCampaign = null;
  window.oathboundTourCampaignReady = loadTourCampaign();

  async function loadTourCampaign() {
    try {
      const response = await fetch(campaignUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Could not load tour campaign data: ${response.status}`);
      }

      const campaigns = await response.json();
      const activeCampaign = getActiveCampaign(campaigns);

      if (!activeCampaign) {
        return null;
      }

      window.oathboundActiveTourCampaign = activeCampaign;
      applyCampaign(activeCampaign);
      return activeCampaign;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function getActiveCampaign(campaigns) {
    if (!Array.isArray(campaigns)) {
      return null;
    }

    const now = new Date();
    return campaigns.find((campaign) => {
      if (!campaign || campaign.enabled === false) {
        return false;
      }

      const startsAt = parseCampaignDate(campaign.startsAt, false);
      const endsAt = parseCampaignDate(campaign.endsAt, true);

      return (!startsAt || now >= startsAt) && (!endsAt || now < endsAt);
    }) || null;
  }

  function parseCampaignDate(value, isEndDate) {
    const text = String(value || "").trim();

    if (!text) {
      return null;
    }

    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
      ? `${text}T${isEndDate ? "23:59:59" : "00:00:00"}`
      : text;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function applyCampaign(campaign) {
    const theme = slugify(campaign.theme || campaign.id || "");

    if (theme) {
      document.documentElement.dataset.tourTheme = theme;
      document.documentElement.classList.add(`${theme}-theme`);
    }

    setCssVariable("--tour-accent", campaign.accent);
    setCssVariable("--tour-accent-text", campaign.accentText || getReadableTextColor(campaign.accent));
    setCssVariable("--tour-accent-2", campaign.accent2);
    setCssVariable("--tour-kicker-color", campaign.kickerColor || getReadableDisplayColor([
      campaign.accent2,
      campaign.accent,
      "#ffffff",
    ]));
    setCssVariable("--tour-glow", campaign.glow);
    setCssVariable("--accent", campaign.accent);

    if (campaign.documentTitle) {
      document.title = campaign.documentTitle;
    }

    if (document.body?.dataset.page === "upcoming") {
      applyUpcomingCopy(campaign);
    }
  }

  function applyUpcomingCopy(campaign) {
    setText(".eyebrow", campaign.eyebrow || campaign.name);
    setPageTitle(campaign.pageTitle || campaign.name, campaign.pageSubtitle);
    setText("#page-copy", campaign.pageCopy);
    setText("#shows-heading", campaign.showsHeading);
    setText(".tour-window-title", campaign.headerTitle || campaign.name);
    applyTourLogo(campaign);
  }

  function setCssVariable(name, value) {
    const text = String(value || "").trim();

    if (text) {
      document.documentElement.style.setProperty(name, text);
    }
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    const text = String(value || "").trim();

    if (element && text) {
      element.textContent = text;
    }
  }

  function setPageTitle(title, subtitle) {
    const element = document.querySelector("#page-title");
    const titleText = String(title || "").trim();

    if (!element || !titleText) {
      return;
    }

    element.textContent = titleText;

    const subtitleText = String(subtitle || "").trim();
    if (subtitleText) {
      const subtitleElement = document.createElement("span");
      subtitleElement.textContent = subtitleText;
      element.appendChild(document.createTextNode(" "));
      element.appendChild(subtitleElement);
    }
  }

  function applyTourLogo(campaign) {
    const logoUrl = String(campaign.logoUrl || "").trim();
    const image = document.querySelector(".brand img");

    if (!logoUrl || !image) {
      return;
    }

    image.src = resolveAssetUrl(logoUrl);
    image.alt = String(campaign.logoAlt || campaign.name || "Tour logo").trim();
    image.closest(".brand")?.classList.add("brand--tour-logo");
  }

  function resolveAssetUrl(url) {
    if (/^(https?:)?\/\//i.test(url) || /^(data|blob):/i.test(url) || url.startsWith("/")) {
      return url;
    }

    return `${rootPath}/${url.replace(/^\.?\//, "")}`;
  }

  function getReadableTextColor(backgroundColor) {
    const rgb = parseColor(backgroundColor);

    if (!rgb) {
      return "";
    }

    const black = { color: "#050505", luminance: getRelativeLuminance([5, 5, 5]) };
    const white = { color: "#ffffff", luminance: 1 };
    const backgroundLuminance = getRelativeLuminance(rgb);
    const blackContrast = getContrastRatio(backgroundLuminance, black.luminance);
    const whiteContrast = getContrastRatio(backgroundLuminance, white.luminance);

    return blackContrast >= whiteContrast ? black.color : white.color;
  }

  function getReadableDisplayColor(colors) {
    const pageBackground = parseColor("#030303");
    const candidates = colors
      .map((color) => String(color || "").trim())
      .filter(Boolean)
      .map((color) => ({
        color,
        rgb: parseColor(color),
      }))
      .filter((candidate) => candidate.rgb);

    if (!candidates.length) {
      return "";
    }

    const backgroundLuminance = getRelativeLuminance(pageBackground);
    const [best] = candidates
      .map((candidate) => ({
        ...candidate,
        contrast: getContrastRatio(getRelativeLuminance(candidate.rgb), backgroundLuminance),
      }))
      .sort((a, b) => b.contrast - a.contrast);

    return best.color;
  }

  function parseColor(value) {
    const text = String(value || "").trim();
    const hexMatch = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

    if (hexMatch) {
      const hex = hexMatch[1].length === 3
        ? hexMatch[1].split("").map((char) => `${char}${char}`).join("")
        : hexMatch[1];

      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }

    const rgbMatch = text.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);

    if (!rgbMatch) {
      return null;
    }

    return rgbMatch.slice(1, 4).map((channel) => Math.max(0, Math.min(255, Number(channel))));
  }

  function getRelativeLuminance(rgb) {
    const [red, green, blue] = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  function getContrastRatio(luminanceA, luminanceB) {
    const lighter = Math.max(luminanceA, luminanceB);
    const darker = Math.min(luminanceA, luminanceB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
})();
