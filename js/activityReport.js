window.onload = loadSummary;

async function loadSummary() {

  const params = new URLSearchParams(location.search);
  const eventId = params.get("id");

  const titleBox = document.getElementById("eventTitle");

  if (!eventId) {
    titleBox.innerHTML = '<p class="error-text">ไม่พบรหัสกิจกรรม</p>';
    return;
  }

  const ev = await getEventInfo(eventId);
  if (ev) {
    const badge = ev.status === "CLOSED"
      ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
      : '<span class="badge badge-open">เปิดรับ</span>';
    titleBox.innerHTML = `<h3>${escapeHtml(ev.name)} ${badge}</h3>`;
  }

  const result = await api("getEventSummary", { eventId });

  if (!result.success) {
    document.getElementById("summary").innerHTML =
      `<p class="error-text">โหลดรายงานไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  document.getElementById("summary").innerHTML = `
    <h3>เข้าร่วม ${result.join}</h3>
    <h3>ไม่เข้าร่วม ${result.absent}</h3>
    <h3>รวม ${result.total}</h3>
  `;

  // The backend has always returned this list, but the page never
  // rendered it before — show who didn't attend and why.
  const absentBox = document.getElementById("absentDetail");
  if (!result.absentList || !result.absentList.length) {
    absentBox.innerHTML = "<p>ไม่มีรายชื่อผู้ไม่เข้าร่วม</p>";
    return;
  }

  let html = `
    <h4>รายชื่อผู้ไม่เข้าร่วม</h4>
    <table border="1">
      <tr>
        <th>ชื่อ</th>
        <th>แผนก</th>
        <th>เหตุผล</th>
      </tr>
  `;
  result.absentList.forEach(p => {
    html += `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.dept)}</td>
        <td>${escapeHtml(p.reason)}</td>
      </tr>
    `;
  });
  html += "</table>";
  absentBox.innerHTML = html;

}
