window.onload = loadSummary;

// Set by the print buttons before calling window.print().
// @media print CSS reads the data-print-mode attribute on <body>
// to show only the relevant section.
function printMode(mode) {
  document.body.setAttribute("data-print-mode", mode);
  window.print();
  // Restore after a tick so the normal page view is unaffected
  setTimeout(() => document.body.removeAttribute("data-print-mode"), 100);
}

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
    titleBox.innerHTML = `<h3>${escapeHtml(ev.name)} ${badge}</h3>
      <div class="muted" id="eventDateLine"></div>`;
    if (ev.eventDate) {
      document.getElementById("eventDateLine").textContent = formatEventDateRange(ev.eventDate, ev.closeDate);
    }
    // Store event name for the print headers
    document.body.dataset.eventName = ev.name;
    document.getElementById("printHeader").textContent =
      `รายงาน: ${ev.name} — พิมพ์เมื่อ ${formatEventDateRange(new Date().toISOString(), null)}`;
  }

  const result = await api("getEventSummary", { eventId });

  if (!result.success) {
    document.getElementById("summary").innerHTML =
      `<p class="error-text">โหลดรายงานไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  document.getElementById("summary").innerHTML = `
    <div style="display:flex; gap:32px; flex-wrap:wrap;">
      <div><div class="stat-label">เข้าร่วม</div><div class="stat-value" style="color:var(--success-600)">${result.join}</div></div>
      <div><div class="stat-label">ไม่เข้าร่วม</div><div class="stat-value" style="color:var(--danger-600)">${result.absent}</div></div>
      <div><div class="stat-label">รวมทั้งหมด</div><div class="stat-value">${result.total}</div></div>
    </div>
  `;

  renderJoinList(result.joinList || []);
  renderAbsentList(result.absentList || []);
  renderDeptStatus(result.submittedDepts || [], result.pendingDepts || []);

}

function renderJoinList(joinList) {
  const box = document.getElementById("joinDetail");

  if (!joinList.length) {
    box.innerHTML = "<p class='muted'>ยังไม่มีผู้เข้าร่วม</p>";
    return;
  }

  let html = `<h4>รายชื่อผู้เข้าร่วม (${joinList.length} คน)</h4>
    <table>
      <tr><th>#</th><th>ชื่อ</th><th>แผนก</th></tr>`;
  joinList.forEach((p, i) => {
    html += `<tr>
      <td class="muted">${i + 1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.dept)}</td>
    </tr>`;
  });
  html += "</table>";
  box.innerHTML = html;
}

function renderAbsentList(absentList) {
  const box = document.getElementById("absentDetail");

  if (!absentList.length) {
    box.innerHTML = "<p class='muted'>ไม่มีรายชื่อผู้ไม่เข้าร่วม</p>";
    return;
  }

  let html = `<h4>รายชื่อผู้ไม่เข้าร่วม (${absentList.length} คน)</h4>
    <table>
      <tr><th>#</th><th>ชื่อ</th><th>แผนก</th><th>เหตุผล</th></tr>`;
  absentList.forEach((p, i) => {
    html += `<tr>
      <td class="muted">${i + 1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.dept)}</td>
      <td>${escapeHtml(p.reason)}</td>
    </tr>`;
  });
  html += "</table>";
  box.innerHTML = html;
}

function renderDeptStatus(submittedDepts, pendingDepts) {
  const box = document.getElementById("deptStatus");
  if (!box) return;

  const total = submittedDepts.length + pendingDepts.length;
  let html = `<h4>สถานะการส่งยอดของแผนก (${submittedDepts.length}/${total})</h4>
    <table><tr><th>แผนก</th><th>สถานะ</th></tr>`;

  submittedDepts.forEach(d => {
    html += `<tr><td>${escapeHtml(d)}</td><td><span class="badge badge-open">ส่งแล้ว</span></td></tr>`;
  });
  pendingDepts.forEach(d => {
    html += `<tr><td>${escapeHtml(d)}</td><td><span class="badge badge-pending">ยังไม่ส่ง</span></td></tr>`;
  });

  html += "</table>";
  if (!total) html += "<p class='muted'>ไม่มีข้อมูลแผนก</p>";
  box.innerHTML = html;
}
