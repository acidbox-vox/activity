// --- Top-of-page loading bar shown while any api() call is in flight ---
// There's no real byte-level progress for a single JSON fetch, so this
// is an indeterminate bar: it creeps toward ~85% while waiting, then
// snaps to 100% and fades out once a response (success or failure)
// comes back. A counter handles pages that fire several api() calls
// at once (e.g. the form page loads event info + departments together).
let __activeRequests = 0;
let __barInterval = null;

function __getLoadingBar() {
  let bar = document.getElementById("__loadingBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "__loadingBar";
    const fill = document.createElement("div");
    fill.id = "__loadingBarFill";
    bar.appendChild(fill);
    document.body.appendChild(bar);
  }
  return bar;
}

function __showLoadingBar() {
  __activeRequests++;
  if (__activeRequests > 1) return; // a bar is already showing

  const bar = __getLoadingBar();
  const fill = document.getElementById("__loadingBarFill");

  clearInterval(__barInterval);
  bar.style.opacity = "1";
  fill.style.transition = "none";
  fill.style.width = "0%";

  let pct = 0;
  requestAnimationFrame(() => {
    fill.style.transition = "width 0.3s ease";
    pct = 20;
    fill.style.width = pct + "%";
  });

  __barInterval = setInterval(() => {
    pct += (85 - pct) * 0.15;
    fill.style.width = pct + "%";
  }, 250);
}

function __hideLoadingBar() {
  __activeRequests = Math.max(0, __activeRequests - 1);
  if (__activeRequests > 0) return; // other api() calls still pending

  clearInterval(__barInterval);
  const bar = document.getElementById("__loadingBar");
  const fill = document.getElementById("__loadingBarFill");
  if (!bar || !fill) return;

  fill.style.transition = "width 0.2s ease";
  fill.style.width = "100%";
  setTimeout(() => {
    bar.style.opacity = "0";
  }, 250);
}

async function api(action, data = {}) {

  __showLoadingBar();
  try {

  let res;
  try {
    res = await fetch(
      GAS_API_URL,
      {
        method: "POST",
        // IMPORTANT: must stay "text/plain" (not "application/json").
        // Apps Script Web Apps don't implement a doOptions() handler,
        // so any fetch with a Content-Type that isn't one of the CORS
        // "simple request" types (text/plain, form-urlencoded,
        // multipart/form-data) triggers a preflight OPTIONS request
        // that Apps Script never answers -> the browser blocks the
        // real POST and fetch() throws. e.postData.contents on the
        // backend is the raw body text regardless of this header, so
        // JSON.parse(e.postData.contents) there is unaffected.
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action,
          ...data
        })
      }
    );
  } catch (err) {
    // fetch() itself threw: the request never reached the server at
    // all (offline, DNS failure, or blocked by CORS/preflight).
    return {
      success: false,
      message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (เครือข่ายหรือถูกบล็อกโดย CORS) กรุณาลองใหม่",
      error: err.toString()
    };
  }

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    // A response came back, but it isn't JSON. This usually means
    // Google returned its own HTML page instead of running the
    // script — most often a permission/login page because the
    // deployment isn't shared as "Anyone", or the deployed URL is
    // stale. Surface the HTTP status and a snippet so it's easier to
    // tell apart from a true network failure.
    return {
      success: false,
      message: `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${res.status}) อาจเป็นเพราะ URL ไม่ถูกต้องหรือสิทธิ์การเข้าถึง Apps Script ไม่ได้ตั้งเป็น "Anyone"`,
      error: text.slice(0, 300)
    };
  }

  } finally {
    __hideLoadingBar();
  }

}

// Shared helper: escape text before interpolating it into innerHTML.
// Event names, department names, and employee names all come from
// the spreadsheet, so a stray "<" or '"' in any of them should not
// be able to break the page or inject markup.
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared helper: look up a single event by id.
// Used by the form page and the report page so both can show
// the event name / status without duplicating the lookup logic.
async function getEventInfo(eventId) {
  if (!eventId) return null;
  const result = await api("getEvent", { eventId });
  return result.success ? result.data : null;
}

// Shared helper: format a date value as Thai day/month/Buddhist-year.
// Returns null if the value can't be parsed as a date.
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function formatThaiDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return {
    day: d.getDate(),
    month: THAI_MONTHS[d.getMonth()],
    year: d.getFullYear() + 543,
    hh: String(d.getHours()).padStart(2, "0"),
    mm: String(d.getMinutes()).padStart(2, "0"),
    dateStr: `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
  };
}

// Shared helper: format an event's date range for display, e.g.
// "20 มิถุนายน 2569 เวลา 08:32 ถึง 20:32". Falls back gracefully when
// closeDate is missing, or shows the close date too if it's a
// different day than the start date.
function formatEventDateRange(startValue, endValue) {
  const start = formatThaiDate(startValue);
  if (!start) return "-";

  let result = `${start.dateStr} เวลา ${start.hh}:${start.mm}`;

  const end = formatThaiDate(endValue);
  if (end) {
    result += ` ถึง ${end.hh}:${end.mm}`;
    if (end.dateStr !== start.dateStr) {
      result += ` (${end.dateStr})`;
    }
  }

  return result;
}
