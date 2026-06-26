window.onload = loadSummary;

function printMode(mode) {
  document.body.setAttribute("data-print-mode", mode);
  document.querySelectorAll(".dept-row").forEach(r => r.classList.add("open"));
  window.print();
  setTimeout(() => document.body.removeAttribute("data-print-mode"), 100);
}

async function loadSummary() {
  const params   = new URLSearchParams(location.search);
  const eventId  = params.get("id");
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
    titleBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 4px;">${escapeHtml(ev.name)} ${badge}</h3>
          <div class="muted" id="eventDateLine" style="font-size:0.9rem;"></div>
        </div>
      </div>`;
    if (ev.eventDate) {
      document.getElementById("eventDateLine").textContent =
        formatEventDateRange(ev.eventDate, ev.closeDate);
    }
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
    <div class="stat-grid">
      <div class="stat-card success">
        <div class="stat-label">เข้าร่วม</div>
        <div class="stat-value">${result.join}</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-label">ไม่เข้าร่วม</div>
        <div class="stat-value">${result.absent}</div>
      </div>
      <div class="stat-card neutral">
        <div class="stat-label">รวมทั้งหมด</div>
        <div class="stat-value">${result.total}</div>
      </div>
    </div>
  `;

  renderJoinList(result.joinList   || []);
  renderAbsentList(result.absentList || []);
  renderDeptStatus(result.submittedDepts || [], result.pendingDepts || []);
}

/* ---- helpers ---- */
function groupByDept(list) {
  const map = {};
  list.forEach(p => {
    if (!map[p.dept]) map[p.dept] = [];
    map[p.dept].push(p);
  });
  return map;
}

function toggleDept(rowEl) {
  rowEl.classList.toggle("open");
}

/* ---- table with colgroup for proper column widths ---- */
function deptTable(members, isAbsent) {
  const rows = members.map((p, i) => `<tr>
    <td class="col-num muted">${i + 1}</td>
    <td class="col-name">${escapeHtml(p.name)}</td>
    <td class="col-sign"></td>
    <td class="col-note">${isAbsent ? escapeHtml(p.reason || "") : ""}</td>
  </tr>`).join("");

  return `
    <table>
      <colgroup>
        <col class="col-num">
        <col class="col-name">
        <col class="col-sign">
        <col class="col-note">
      </colgroup>
      <tr>
        <th class="col-num">#</th>
        <th class="col-name">ชื่อ</th>
        <th class="col-sign">ลงชื่อ</th>
        <th class="col-note">หมายเหตุ</th>
      </tr>
      ${rows}
    </table>`;
}

/* ---- join list — accordion by dept ---- */
function renderJoinList(joinList) {
  const box = document.getElementById("joinDetail");
  if (!joinList.length) {
    box.innerHTML = "<p class='muted'>ยังไม่มีผู้เข้าร่วม</p>";
    return;
  }

  const byDept    = groupByDept(joinList);
  const depts     = Object.keys(byDept).sort();
  const eventName = document.body.dataset.eventName || "";

  let html = `
    <div class="report-section-header">
      <h3>✅ รายชื่อผู้เข้าร่วม</h3>
      <span class="count-chip">${joinList.length} คน</span>
    </div>
    <div class="dept-accordion" id="joinAccordion">
  `;

  depts.forEach((dept, di) => {
    const members = byDept[dept];
    html += `
      <div class="dept-row dept-submitted" id="join-dept-${di}">
        <div class="dept-row-header" onclick="toggleDept(this.parentElement)">
          <div class="dept-row-title"><span>${escapeHtml(dept)}</span></div>
          <div class="dept-row-meta">
            <span>${members.length} คน</span>
            <span class="badge badge-open">เข้าร่วม</span>
            <span class="dept-chevron">▼</span>
          </div>
        </div>
        <div class="dept-row-body">
          <div class="dept-print-page-header">${escapeHtml(eventName)} — ผู้เข้าร่วม — แผนก ${escapeHtml(dept)}</div>
          ${deptTable(members, false)}
          <div class="dept-print-summary">สรุป: เข้าร่วม ${members.length} คน</div>
        </div>
      </div>
    `;
  });

  html += "</div>";
  box.innerHTML = html;
}

/* ---- absent list — accordion by dept ---- */
function renderAbsentList(absentList) {
  const box = document.getElementById("absentDetail");
  if (!absentList.length) {
    box.innerHTML = "<p class='muted'>ไม่มีรายชื่อผู้ไม่เข้าร่วม</p>";
    return;
  }

  const byDept    = groupByDept(absentList);
  const depts     = Object.keys(byDept).sort();
  const eventName = document.body.dataset.eventName || "";

  let html = `
    <div class="report-section-header">
      <h3>❌ รายชื่อผู้ไม่เข้าร่วม</h3>
      <span class="count-chip">${absentList.length} คน</span>
    </div>
    <div class="dept-accordion" id="absentAccordion">
  `;

  depts.forEach((dept, di) => {
    const members = byDept[dept];
    html += `
      <div class="dept-row dept-pending" id="absent-dept-${di}">
        <div class="dept-row-header" onclick="toggleDept(this.parentElement)">
          <div class="dept-row-title"><span>${escapeHtml(dept)}</span></div>
          <div class="dept-row-meta">
            <span>${members.length} คน</span>
            <span class="badge badge-closed">ไม่เข้าร่วม</span>
            <span class="dept-chevron">▼</span>
          </div>
        </div>
        <div class="dept-row-body">
          <div class="dept-print-page-header">${escapeHtml(eventName)} — ผู้ไม่เข้าร่วม — แผนก ${escapeHtml(dept)}</div>
          ${deptTable(members, true)}
          <div class="dept-print-summary">สรุป: ไม่เข้าร่วม ${members.length} คน</div>
        </div>
      </div>
    `;
  });

  html += "</div>";
  box.innerHTML = html;
}

/* ---- dept submission status — accordion ---- */
function renderDeptStatus(submittedDepts, pendingDepts) {
  const box = document.getElementById("deptStatus");
  if (!box) return;

  const total = submittedDepts.length + pendingDepts.length;
  let html = `
    <div class="report-section-header">
      <h3>📋 สถานะแผนกส่งยอด</h3>
      <span class="count-chip">${submittedDepts.length}/${total}</span>
    </div>
    <div class="dept-accordion">
  `;

  submittedDepts.forEach((d, i) => { html += deptStatusRow(d, true,  i); });
  pendingDepts.forEach((d, i)   => { html += deptStatusRow(d, false, submittedDepts.length + i); });

  html += `</div>`;
  if (!total) html += "<p class='muted'>ไม่มีข้อมูลแผนก</p>";
  box.innerHTML = html;
}

function deptStatusRow(dept, submitted, idx) {
  const cls   = submitted ? "dept-submitted" : "dept-pending";
  const badge = submitted
    ? '<span class="badge badge-open">ส่งแล้ว</span>'
    : '<span class="badge badge-pending">ยังไม่ส่ง</span>';
  return `
    <div class="dept-row ${cls}" id="dept-status-${idx}">
      <div class="dept-row-header" onclick="toggleDept(this.parentElement)">
        <div class="dept-row-title"><span>${escapeHtml(dept)}</span></div>
        <div class="dept-row-meta">${badge}<span class="dept-chevron">▼</span></div>
      </div>
      <div class="dept-row-body">
        <p style="margin:var(--space-2) 0 0; font-size:0.88rem; color:var(--ink-400);">
          ${submitted ? "แผนกนี้ส่งยอดเรียบร้อยแล้ว" : "แผนกนี้ยังไม่ได้ส่งยอด"}
        </p>
      </div>
    </div>
  `;
}
