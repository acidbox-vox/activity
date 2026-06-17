window.onload = loadAdminEvents;

async function createEvent() {

  const eventNameEl = document.getElementById("eventName");
  const eventDateEl = document.getElementById("eventDate");

  const data = {
    eventName: eventNameEl.value.trim(),
    eventDate: eventDateEl.value,
    closeDate: document.getElementById("closeDate").value,
    detail: document.getElementById("detail").value
  };

  if (!data.eventName) {
    alert("กรุณาระบุชื่อกิจกรรม");
    return;
  }
  if (!data.eventDate) {
    alert("กรุณาระบุวันเวลาเริ่มกิจกรรม");
    return;
  }

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
  if (!box) return; // page doesn't have the management table

  box.innerHTML = "กำลังโหลด...";

  const result = await api("getEvents");

  if (!result.success) {
    box.innerHTML = `<p class="error-text">โหลดรายการไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  if (!result.data.length) {
    box.innerHTML = "<p>ยังไม่มีกิจกรรม</p>";
    return;
  }

  let html = `
    <table border="1">
      <tr>
        <th>ชื่อกิจกรรม</th>
        <th>วันที่</th>
        <th>สถานะ</th>
        <th>การจัดการ</th>
      </tr>
  `;

  result.data.forEach(ev => {
    const isClosed = ev.status === "CLOSED";
    const badge = isClosed
      ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
      : '<span class="badge badge-open">เปิดรับ</span>';
    const toggleButton = isClosed
      ? `<button onclick="toggleEvent('${ev.id}', 'reopen')">เปิดรับอีกครั้ง</button>`
      : `<button onclick="toggleEvent('${ev.id}', 'close')">ปิดรับรายงาน</button>`;

    html += `
      <tr>
        <td>${escapeHtml(ev.name)}</td>
        <td>${escapeHtml(ev.eventDate)}</td>
        <td>${badge}</td>
        <td>
          ${toggleButton}
          <button onclick="location.href='activity-report.html?id=${encodeURIComponent(ev.id)}'">ดูรายงาน</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  box.innerHTML = html;

}

async function toggleEvent(eventId, action) {
  const apiAction = action === "close" ? "closeEvent" : "reopenEvent";
  const result = await api(apiAction, { eventId });
  if (!result.success) {
    alert("ทำรายการไม่สำเร็จ: " + (result.message || result.error || ""));
    return;
  }
  loadAdminEvents();
}
