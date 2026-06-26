window.onload = loadAdminEvents;

// ── State ──────────────────────────────────────────────
let editingEventId = null;  // null = create mode, string = edit mode
let closedVisible  = false; // toggle past events panel

// ── Create / Update ────────────────────────────────────
function setEditMode(ev) {
  // ev = null → create mode; ev = event object → edit mode
  editingEventId = ev ? ev.id : null;

  const formCard  = document.getElementById("formCard");
  const formTitle = document.getElementById("formTitle");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (ev) {
    formTitle.textContent = "✏️ แก้ไขกิจกรรม";
    submitBtn.textContent = "บันทึกการแก้ไข";
    cancelBtn.style.display = "";
    // populate fields
    document.getElementById("eventName").value  = ev.name  || "";
    document.getElementById("detail").value     = ev.detail || "";
    // convert ISO/Date to datetime-local value
    document.getElementById("eventDate").value  = toDatetimeLocal(ev.eventDate);
    document.getElementById("closeDate").value  = toDatetimeLocal(ev.closeDate);
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    formTitle.textContent = "➕ สร้างกิจกรรม";
    submitBtn.textContent = "สร้างกิจกรรม";
    cancelBtn.style.display = "none";
    document.getElementById("eventName").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("closeDate").value = "";
    document.getElementById("detail").value    = "";
  }
}

function cancelEdit() {
  setEditMode(null);
}

function toDatetimeLocal(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  // "YYYY-MM-DDTHH:MM" format required by datetime-local input
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function submitForm() {
  const eventNameEl = document.getElementById("eventName");
  const eventDateEl = document.getElementById("eventDate");

  const data = {
    eventName: eventNameEl.value.trim(),
    eventDate: eventDateEl.value,
    closeDate: document.getElementById("closeDate").value,
    detail:    document.getElementById("detail").value,
    adminCode: getAuth().adminCode
  };

  if (!data.eventName) { alert("กรุณาระบุชื่อกิจกรรม"); return; }
  if (!data.eventDate) { alert("กรุณาระบุวันเวลาเริ่มกิจกรรม"); return; }

  let result;
  if (editingEventId) {
    result = await api("updateEvent", { ...data, eventId: editingEventId });
  } else {
    result = await api("createEvent", data);
  }

  if (result.success) {
    setEditMode(null);
    loadAdminEvents();
  } else {
    alert("ทำรายการไม่สำเร็จ: " + (result.message || result.error || ""));
  }
}

// ── Load & Render ──────────────────────────────────────
async function loadAdminEvents() {
  const openBox   = document.getElementById("openEventList");
  const closedBox = document.getElementById("closedEventList");
  openBox.innerHTML   = "<p class='muted'>กำลังโหลด...</p>";
  closedBox.innerHTML = "";

  const result = await api("getEvents");
  if (!result.success) {
    openBox.innerHTML = `<p class="error-text">โหลดรายการไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  // newest first (already reversed in backend, but guard anyway)
  const events = result.data;
  const open   = events.filter(ev => ev.status !== "CLOSED");
  const closed = events.filter(ev => ev.status === "CLOSED");

  // update closed count badge
  document.getElementById("closedCount").textContent = closed.length;

  if (!open.length) {
    openBox.innerHTML = "<p class='muted'>ยังไม่มีกิจกรรมที่เปิดอยู่</p>";
  } else {
    openBox.innerHTML = open.map(ev => renderEventCard(ev)).join("");
  }

  closedBox.innerHTML = closed.length
    ? closed.map(ev => renderEventCard(ev)).join("")
    : "<p class='muted'>ไม่มีกิจกรรมที่ปิดแล้ว</p>";
}

function renderEventCard(ev) {
  const isClosed = ev.status === "CLOSED";
  const badge = isClosed
    ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
    : '<span class="badge badge-open">เปิดรับ</span>';
  const toggleBtn = isClosed
    ? `<button class="secondary" onclick="toggleEvent('${ev.id}', 'reopen')">เปิดรับอีกครั้ง</button>`
    : `<button class="danger"    onclick="toggleEvent('${ev.id}', 'close')">ปิดรับรายงาน</button>`;
  const detail = ev.detail
    ? `<div class="muted" style="font-size:0.85rem; margin-top:4px;">${escapeHtml(ev.detail)}</div>`
    : "";

  // encode ev for inline edit handler
  const evJson = escapeHtml(JSON.stringify({
    id: ev.id, name: ev.name, detail: ev.detail || "",
    eventDate: ev.eventDate, closeDate: ev.closeDate
  }));

  return `
    <div class="event-card${isClosed ? " is-closed" : ""}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3);">
        <div style="flex:1; min-width:0;">
          <h3 style="margin:0 0 4px;">${escapeHtml(ev.name)} ${badge}</h3>
          <div class="muted" style="font-size:0.88rem;">📅 ${formatEventDateRange(ev.eventDate, ev.closeDate)}</div>
          ${detail}
        </div>
      </div>
      <div style="display:flex; gap:var(--space-2); flex-wrap:wrap;">
        <button onclick="startEdit('${ev.id}')">✏️ แก้ไข</button>
        ${toggleBtn}
        <button class="secondary" onclick="location.href='activity-report.html?id=${encodeURIComponent(ev.id)}'">📋 ดูรายงาน</button>
      </div>
    </div>
  `;
}

// cache for edit — keeps a local copy so we don't need an extra API call
let _eventsCache = {};

async function startEdit(eventId) {
  // try cache first, otherwise fetch
  let ev = _eventsCache[eventId];
  if (!ev) {
    const r = await api("getEvent", { eventId });
    if (!r.success) { alert("ไม่สามารถโหลดข้อมูลกิจกรรมได้"); return; }
    ev = r.data;
  }
  setEditMode(ev);
}

// keep cache updated after load
const _origLoad = loadAdminEvents;
async function loadAdminEvents() {
  const openBox   = document.getElementById("openEventList");
  const closedBox = document.getElementById("closedEventList");
  openBox.innerHTML   = "<p class='muted'>กำลังโหลด...</p>";
  closedBox.innerHTML = "";

  const result = await api("getEvents");
  if (!result.success) {
    openBox.innerHTML = `<p class="error-text">โหลดรายการไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  const events = result.data;
  // rebuild cache
  _eventsCache = {};
  events.forEach(ev => { _eventsCache[ev.id] = ev; });

  const open   = events.filter(ev => ev.status !== "CLOSED");
  const closed = events.filter(ev => ev.status === "CLOSED");

  document.getElementById("closedCount").textContent = closed.length;

  openBox.innerHTML = open.length
    ? open.map(ev => renderEventCard(ev)).join("")
    : "<p class='muted'>ยังไม่มีกิจกรรมที่เปิดอยู่</p>";

  closedBox.innerHTML = closed.length
    ? closed.map(ev => renderEventCard(ev)).join("")
    : "<p class='muted'>ไม่มีกิจกรรมที่ปิดแล้ว</p>";
}

function toggleClosedPanel() {
  closedVisible = !closedVisible;
  const panel = document.getElementById("closedPanel");
  const btn   = document.getElementById("closedToggleBtn");
  panel.style.display = closedVisible ? "block" : "none";
  btn.textContent     = closedVisible
    ? "▲ ซ่อนกิจกรรมที่ผ่านไปแล้ว"
    : `▼ กิจกรรมที่ผ่านไปแล้ว (${document.getElementById("closedCount").textContent})`;
}

async function toggleEvent(eventId, action) {
  const apiAction = action === "close" ? "closeEvent" : "reopenEvent";
  const result = await api(apiAction, { eventId, adminCode: getAuth().adminCode });
  if (!result.success) {
    alert("ทำรายการไม่สำเร็จ: " + (result.message || result.error || ""));
    return;
  }
  loadAdminEvents();
}
