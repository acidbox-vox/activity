window.onload = loadEvents;

async function loadEvents() {
  const box = document.getElementById("eventList");
  box.innerHTML = "<p class='muted'>กำลังโหลด...</p>";

  const result = await api("getEvents");

  if (!result.success) {
    box.innerHTML = `<p class="error-text">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  if (!result.data.length) {
    box.innerHTML = "<p class='muted'>ยังไม่มีกิจกรรม</p>";
    return;
  }

  box.innerHTML = "";
  result.data.forEach(ev => {
    const isClosed = ev.status === "CLOSED";
    const badge = isClosed
      ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
      : '<span class="badge badge-open">เปิดรับ</span>';
    const submitBtn = isClosed
      ? '<button disabled>ปิดรับยอดแล้ว</button>'
      : `<button onclick="location.href='activity-form.html?id=${encodeURIComponent(ev.id)}'">ส่งยอด</button>`;

    box.innerHTML += `
      <div class="event-card${isClosed ? " is-closed" : ""}">
        <div style="margin-bottom:var(--space-3);">
          <h3 style="margin:0 0 4px;">${escapeHtml(ev.name)} ${badge}</h3>
          <div class="muted" style="font-size:0.88rem;">📅 ${formatEventDateRange(ev.eventDate, ev.closeDate)}</div>
        </div>
        <div style="display:flex; gap:var(--space-2); flex-wrap:wrap;">
          ${submitBtn}
          <button class="secondary" onclick="location.href='activity-report.html?id=${encodeURIComponent(ev.id)}'">ดูรายงาน</button>
        </div>
      </div>
    `;
  });
}
