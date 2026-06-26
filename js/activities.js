window.onload = loadEvents;

let closedVisible = false;

async function loadEvents() {
  const openBox   = document.getElementById("openList");
  const closedBox = document.getElementById("closedList");
  openBox.innerHTML = "<p class='muted'>กำลังโหลด...</p>";

  const result = await api("getEvents");

  if (!result.success) {
    openBox.innerHTML = `<p class="error-text">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  const events = result.data; // already newest-first from backend
  const open   = events.filter(ev => ev.status !== "CLOSED");
  const closed = events.filter(ev => ev.status === "CLOSED");

  document.getElementById("closedCount").textContent = closed.length;

  if (!open.length) {
    openBox.innerHTML = "<p class='muted'>ยังไม่มีกิจกรรมที่เปิดรับอยู่</p>";
  } else {
    openBox.innerHTML = open.map(ev => renderCard(ev)).join("");
  }

  closedBox.innerHTML = closed.length
    ? closed.map(ev => renderCard(ev)).join("")
    : "<p class='muted'>ไม่มีกิจกรรมที่ปิดแล้ว</p>";
}

function renderCard(ev) {
  const isClosed = ev.status === "CLOSED";
  const badge = isClosed
    ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
    : '<span class="badge badge-open">เปิดรับ</span>';
  const submitBtn = isClosed
    ? '<button disabled>ปิดรับยอดแล้ว</button>'
    : `<button onclick="location.href='activity-form.html?id=${encodeURIComponent(ev.id)}'">ส่งยอด</button>`;
  const detail = ev.detail
    ? `<div class="muted" style="font-size:0.85rem; margin-top:4px;">${escapeHtml(ev.detail)}</div>`
    : "";

  return `
    <div class="event-card${isClosed ? " is-closed" : ""}">
      <div style="margin-bottom:var(--space-3);">
        <h3 style="margin:0 0 4px;">${escapeHtml(ev.name)} ${badge}</h3>
        <div class="muted" style="font-size:0.88rem;">📅 ${formatEventDateRange(ev.eventDate, ev.closeDate)}</div>
        ${detail}
      </div>
      <div style="display:flex; gap:var(--space-2); flex-wrap:wrap;">
        ${submitBtn}
        <button class="secondary" onclick="location.href='activity-report.html?id=${encodeURIComponent(ev.id)}'">ดูรายงาน</button>
      </div>
    </div>
  `;
}

function toggleClosed() {
  closedVisible = !closedVisible;
  const panel = document.getElementById("closedPanel");
  const btn   = document.getElementById("closedToggleBtn");
  panel.style.display = closedVisible ? "block" : "none";
  btn.textContent = closedVisible
    ? "▲ ซ่อนกิจกรรมที่ผ่านไปแล้ว"
    : `▼ กิจกรรมที่ผ่านไปแล้ว (${document.getElementById("closedCount").textContent})`;
}
