window.onload = loadEvents;

async function loadEvents() {

  const box = document.getElementById("eventList");
  box.innerHTML = "กำลังโหลด...";

  const result = await api("getEvents");

  if (!result.success) {
    box.innerHTML = `<p class="error-text">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  if (!result.data.length) {
    box.innerHTML = "<p>ยังไม่มีกิจกรรม</p>";
    return;
  }

  box.innerHTML = "";

  result.data.forEach(ev => {

    const isClosed = ev.status === "CLOSED";
    const badge = isClosed
      ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
      : '<span class="badge badge-open">เปิดรับ</span>';

    const submitButton = isClosed
      ? '<button disabled>ปิดรับยอดแล้ว</button>'
      : `<button onclick="location.href='activity-form.html?id=${encodeURIComponent(ev.id)}'">ส่งยอด</button>`;

    box.innerHTML += `
      <div class="event-card">
        <h3>${escapeHtml(ev.name)} ${badge}</h3>
        <div>วันที่ : ${escapeHtml(ev.eventDate)}</div>
        <br>
        ${submitButton}
        <button onclick="location.href='activity-report.html?id=${encodeURIComponent(ev.id)}'">ดูรายงาน</button>
      </div>
    `;

  });

}
