async function api(action, data = {}) {

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
