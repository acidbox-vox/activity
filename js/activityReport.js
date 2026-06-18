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

  renderDeptStatus(result.submittedDepts || [], result.pendingDepts || []);
  renderAbsentList(result.absentList || []);

}

function renderDeptStatus(submittedDepts, pendingDepts) {

  const box = document.getElementById("deptStatus");
  if (!box) return;

  let html = '<h4>สถานะการส่งยอดของแผนก</h4><table border="1"><tr><th>แผนก</th><th>สถานะ</th></tr>';

  submittedDepts.forEach(d => {
    html += `<tr><td>${escapeHtml(d)}</td><td><span class="badge badge-open">ส่งแล้ว</span></td></tr>`;
  });
  pendingDepts.forEach(d => {
    html += `<tr><td>${escapeHtml(d)}</td><td><span class="badge badge-pending">ยังไม่ส่ง</span></td></tr>`;
  });

  html += "</table>";

  if (!submittedDepts.length && !pendingDepts.length) {
    html += "<p>ไม่มีข้อมูลแผนก</p>";
  }

  box.innerHTML = html;

}

function renderAbsentList(absentList) {

  const absentBox = document.getElementById("absentDetail");

  if (!absentList.length) {
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
  absentList.forEach(p => {
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
