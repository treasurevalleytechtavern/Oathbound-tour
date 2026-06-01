const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const showsPath = path.join(root, "data", "shows.json");
const kitsRoot = path.join(root, "street-team", "kits");

const shows = JSON.parse(fs.readFileSync(showsPath, "utf8"));
const folders = new Set();

shows.forEach((show) => {
  const normalized = normalizeShow(show);

  if (!normalized.citySlug || !normalized.regionSlug) {
    return;
  }

  folders.add(path.join(kitsRoot, normalized.regionSlug, normalized.citySlug));
});

Array.from(folders).sort().forEach((folder) => {
  fs.mkdirSync(folder, { recursive: true });
  const keepFile = path.join(folder, ".gitkeep");

  if (!fs.existsSync(keepFile)) {
    fs.writeFileSync(keepFile, "");
  }
});

console.log(`Prepared ${folders.size} street team kit folders.`);

function normalizeShow(show) {
  let city = String(show.city || "").trim();
  let region = String(show.region || "").trim().toUpperCase();

  if (!region && city.includes(",")) {
    const parts = city.split(",");
    city = parts.shift().trim();
    region = parts.join(",").trim().toUpperCase();
  }

  return {
    citySlug: show.citySlug || slugify(city),
    regionSlug: show.regionSlug || slugify(region),
  };
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
