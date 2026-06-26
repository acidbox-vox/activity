window.onload = loadAdminEvents;

async function createNewEvent() {
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

  const result = await api("createEvent", data);
  if (result.success) {
    alert("สร้างกิจกรรมสำเร็จ");
    eventNameEl.value = "";
    eventDateEl.value = "";
    document.getElementById("closeDate").value = "";
    document.getElementById("detail").value = "";
    loadAdminEvents();
  } else {
    alert("สร้างกิจกรรมไม่สำเร็จ: " + (result.message || result.error || ""));
  }
}

async function loadAdminEvents() {
  const box = document.getElementById("adminEventList");
  if (!box) return;

  box.innerHTML = "<p class='muted'>กำลังโหลด...</p>";
  const result = await api("getEvents");

  if (!result.success) {
    box.innerHTML = `<p class="error-text">โหลดรายการไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  if (!result.data.length) {
    box.innerHTML = "<p class='muted'>ยังไม่มีกิจกรรม</p>";
    return;
  }

  let html = "";
  result.data.forEach(ev => {
    const isClosed = ev.status === "CLOSED";
    const badge = isClosed
      ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
      : '<span class="badge badge-open">เปิดรับ</span>';
    const toggleBtn = isClosed
      ? `<button class="secondary" onclick="toggleEvent('${ev.id}', 'reopen')">เปิดรับอีกครั้ง</button>`
      : `<button class="danger"    onclick="toggleEvent('${ev.id}', 'close')">ปิดรับรายงาน</button>`;

    html += `
      <div class="event-card${isClosed ? " is-closed" : ""}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3);">
          <div>
            <h3 style="margin:0 0 4px;">${escapeHtml(ev.name)} ${badge}</h3>
            <div class="muted" style="font-size:0.88rem;">${formatEventDateRange(ev.eventDate, ev.closeDate)}</div>
          </div>
        </div>
        <div style="display:flex; gap:var(--space-2); flex-wrap:wrap;">
          ${toggleBtn}
          <button onclick="location.href='activity-report.html?id=${encodeURIComponent(ev.id)}'">ดูรายงาน</button>
        </div>
      </div>
    `;
  });

  box.innerHTML = html;
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
