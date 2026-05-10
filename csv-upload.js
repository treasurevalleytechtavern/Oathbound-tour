const csvInput = document.querySelector("#csv-file");
const statusText = document.querySelector("#upload-status");
const errorList = document.querySelector("#csv-errors");
const preview = document.querySelector("#json-preview");
const downloadButton = document.querySelector("#download-json");

const fields = [
  "date",
  "doorsTime",
  "showTime",
  "venue",
  "address",
  "city",
  "region",
  "country",
  "lineup",
  "status",
  "ageRestriction",
  "ticketUrl",
  "ticketLabel",
  "infoUrl",
  "infoLabel",
  "notes",
];

let jsonBlobUrl = "";

csvInput.addEventListener("change", handleCsvUpload);
downloadButton.addEventListener("click", downloadJson);

async function handleCsvUpload(event) {
  resetOutput();

  const [file] = event.target.files;
  if (!file) {
    statusText.textContent = "Waiting for CSV";
    return;
  }

  try {
    const csvText = await file.text();
    const rows = parseCsv(csvText);
    const { shows, errors } = rowsToShows(rows);

    if (errors.length) {
      renderErrors(errors);
      statusText.textContent = "CSV needs attention";
      return;
    }

    const json = `${JSON.stringify(shows, null, 2)}\n`;
    preview.value = json;
    setDownload(json);
    statusText.textContent = `${shows.length} ${shows.length === 1 ? "show" : "shows"} ready`;
  } catch (error) {
    renderErrors(["Could not read that CSV file."]);
    statusText.textContent = "Upload failed";
    console.error(error);
  }
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === "\"" && insideQuotes && next === "\"") {
      value += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function rowsToShows(rows) {
  const errors = [];

  if (rows.length < 2) {
    return {
      shows: [],
      errors: ["The CSV needs a header row and at least one show row."],
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const missingRequired = ["date"].filter((field) => !headers.includes(field));

  if (missingRequired.length) {
    errors.push(`Missing required columns: ${missingRequired.join(", ")}.`);
  }

  const shows = rows.slice(1).map((row, rowIndex) => {
    const show = {};

    fields.forEach((field) => {
      const columnIndex = headers.indexOf(field);
      show[field] = columnIndex >= 0 ? cleanCell(row[columnIndex]) : "";
    });

    show.date = normalizeDate(show.date);
    validateShow(show, rowIndex + 2, errors);
    return show;
  });

  return {
    shows: shows.filter((show) => show.date || show.venue || show.address || show.city),
    errors,
  };
}

function validateShow(show, rowNumber, errors) {
  if (!show.date && !show.venue && !show.address && !show.city) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(show.date)) {
    errors.push(`Row ${rowNumber}: date must use YYYY-MM-DD.`);
  }

  ["ticketUrl", "infoUrl"].forEach((field) => {
    if (show[field] && !isValidUrl(show[field])) {
      errors.push(`Row ${rowNumber}: ${field} must be a full URL, like https://example.com.`);
    }
  });
}

function normalizeHeader(header) {
  const normalized = header.trim().replace(/[\s_-]+/g, "").toLowerCase();
  const aliases = {
    agerestriction: "ageRestriction",
    ages: "ageRestriction",
    doors: "doorsTime",
    doortime: "doorsTime",
    doorstime: "doorsTime",
    doorsopen: "doorsTime",
    show: "showTime",
    showtime: "showTime",
    starttime: "showTime",
    time: "showTime",
    ticketlink: "ticketUrl",
    tickets: "ticketUrl",
    ticketurl: "ticketUrl",
    ticketlabel: "ticketLabel",
    street: "address",
    streetaddress: "address",
    venueaddress: "address",
    infolink: "infoUrl",
    details: "infoUrl",
    infourl: "infoUrl",
    infolabel: "infoLabel",
    state: "region",
    province: "region",
    support: "lineup",
    showstatus: "status",
    statustext: "status",
  };

  return aliases[normalized] || fields.find((field) => field.toLowerCase() === normalized) || normalized;
}

function cleanCell(value = "") {
  return value.trim();
}

function normalizeDate(value) {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
  }

  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
  }

  return trimmed;
}

function padDatePart(value) {
  return value.padStart(2, "0");
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function setDownload(json) {
  if (jsonBlobUrl) {
    URL.revokeObjectURL(jsonBlobUrl);
  }

  jsonBlobUrl = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  downloadButton.disabled = false;
}

function downloadJson() {
  if (!jsonBlobUrl) {
    return;
  }

  const link = document.createElement("a");
  link.href = jsonBlobUrl;
  link.download = "shows.json";
  link.click();
}

function renderErrors(errors) {
  errorList.innerHTML = `
    <div class="error-state">
      <h3>Fix the CSV</h3>
      <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
    </div>
  `;
}

function resetOutput() {
  preview.value = "";
  errorList.innerHTML = "";
  downloadButton.disabled = true;

  if (jsonBlobUrl) {
    URL.revokeObjectURL(jsonBlobUrl);
    jsonBlobUrl = "";
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    };

    return entities[char];
  });
}
