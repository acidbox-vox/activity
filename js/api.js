async function api(action, data = {}) {
  try {
    const res = await fetch(
      GAS_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          ...data
        })
      }
    );

    return await res.json();

  } catch (err) {
    // Network error, server down, or non-JSON response.
    // Return the same shape callers already check (`result.success`)
    // so every page can handle failures the same way.
    return {
      success: false,
      message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่",
      error: err.toString()
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
