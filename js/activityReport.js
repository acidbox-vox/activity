window.onload = loadSummary;

// Dept lists for print dialog
let _allDepts  = [];   // all dept names from current data
let _printMode = "all"; // current print type

// ── Print dialog ────────────────────────────────────────
function openPrintDialog(mode) {
  if (mode === "dept") { printMode("dept"); return; } // dept status has no dept filter
  _printMode = mode;
  const label = mode === "join" ? "ผู้เข้าร่วม"
              : mode === "absent" ? "ผู้ไม่เข้าร่วม"
              : "ทั้งหมด";
  document.getElementById("dialogTitle").textContent = `เลือกแผนกที่ต้องการพิมพ์ — ${label}`;

  const list = document.getElementById("deptCheckboxList");
  list.innerHTML = _allDepts.map(d => `
    <label style="display:flex; align-items:center; gap:var(--space-2); cursor:pointer; font-size:0.95rem;">
      <input type="checkbox" class="dept-chk" value="${escapeHtml(d)}" checked
             style="width:16px; height:16px; accent-color:var(--indigo-500);">
      ${escapeHtml(d)}
    </label>
  `).join("");

  const overlay = document.getElementById("printDialogOverlay");
  overlay.style.display = "flex";
}

function closePrintDialog() {
  document.getElementById("printDialogOverlay").style.display = "none";
}

function selectAllDepts(checked) {
  document.querySelectorAll(".dept-chk").forEach(c => c.checked = checked);
}

function confirmPrint() {
  const selected = new Set(
    [...document.querySelectorAll(".dept-chk:checked")].map(c => c.value)
  );
  if (!selected.size) { alert("กรุณาเลือกอย่างน้อย 1 แผนก"); return; }
  closePrintDialog();
  printMode(_printMode, selected);
}

function printMode(mode, deptFilter) {
  document.body.setAttribute("data-print-mode", mode);

  // Mark which dept-rows are included
  document.querySelectorAll(".dept-row").forEach(r => {
    r.classList.add("open");
    const deptName = r.dataset.dept || "";
    if (deptFilter) {
      r.dataset.printInclude = deptFilter.has(deptName) ? "1" : "0";
    } else {
      r.dataset.printInclude = "1";
    }
  });

  window.print();

  setTimeout(() => {
    document.body.removeAttribute("data-print-mode");
    document.querySelectorAll(".dept-row").forEach(r => delete r.dataset.printInclude);
  }, 100);
}

// ── Load summary ─────────────────────────────────────────
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
      <div>
        <h3 style="margin:0 0 4px;">${escapeHtml(ev.name)} ${badge}</h3>
        <div class="muted" id="eventDateLine" style="font-size:0.9rem;"></div>
      </div>`;
    if (ev.eventDate) {
      document.getElementById("eventDateLine").textContent =
        formatEventDateRange(ev.eventDate, ev.closeDate);
    }
    document.body.dataset.eventName = ev.name;
    document.getElementById("printHeader").textContent =
      `รายงาน: ${ev.name}`;
  }

  const result = await api("getEventSummary", { eventId });
  if (!result.success) {
    document.getElementById("summary").innerHTML =
      `<p class="error-text">โหลดรายงานไม่สำเร็จ: ${escapeHtml(result.message || result.error || "")}</p>`;
    return;
  }

  document.getElementById("summary").innerHTML = `
    <div class="stat-grid">
      <div class="stat-card success"><div class="stat-label">เข้าร่วม</div><div class="stat-value">${result.join}</div></div>
      <div class="stat-card danger"><div class="stat-label">ไม่เข้าร่วม</div><div class="stat-value">${result.absent}</div></div>
      <div class="stat-card neutral"><div class="stat-label">รวมทั้งหมด</div><div class="stat-value">${result.total}</div></div>
    </div>
  `;

  const joinList   = result.joinList   || [];
  const absentList = result.absentList || [];

  // Collect all dept names for print dialog
  const deptSet = new Set([
    ...joinList.map(p => p.dept),
    ...absentList.map(p => p.dept)
  ]);
  _allDepts = [...deptSet].sort();

  renderJoinList(joinList);
  renderAbsentList(absentList);
  renderDeptStatus(result.submittedDepts || [], result.pendingDepts || []);
}

// ── Helpers ──────────────────────────────────────────────
function groupByDept(list) {
  const map = {};
  list.forEach(p => {
    const d = p.dept || p.department || "ไม่ระบุแผนก";
    if (!map[d]) map[d] = [];
    map[d].push(p);
  });
  return map;
}

function toggleDept(rowEl) { rowEl.classList.toggle("open"); }

function deptTable(members, isAbsent) {
  const rows = members.map((p, i) => `<tr>
    <td class="col-num">${i + 1}</td>
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
        <th class="col-name" style="text-align:center;">ชื่อ</th>
        <th class="col-sign" style="text-align:center;">ลงชื่อ</th>
        <th class="col-note" style="text-align:center;">หมายเหตุ</th>
      </tr>
      ${rows}
    </table>`;
}

// ── Join list ────────────────────────────────────────────
function renderJoinList(joinList) {
  const box = document.getElementById("joinDetail");
  if (!joinList.length) { box.innerHTML = "<p class='muted'>ยังไม่มีผู้เข้าร่วม</p>"; return; }

  const byDept    = groupByDept(joinList);
  const depts     = Object.keys(byDept).sort();
  const eventName = document.body.dataset.eventName || "";

  let html = `
    <div class="report-section-header">
      <h3>✅ รายชื่อผู้เข้าร่วม</h3>
      <span class="count-chip">${joinList.length} คน</span>
    </div>
    <div class="dept-accordion">`;

  depts.forEach((dept, di) => {
    const members = byDept[dept];
    html += `
      <div class="dept-row dept-submitted" id="join-dept-${di}" data-dept="${escapeHtml(dept)}">
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
      </div>`;
  });

  html += "</div>";
  box.innerHTML = html;
}

// ── Absent list ───────────────────────────────────────────
function renderAbsentList(absentList) {
  const box = document.getElementById("absentDetail");
  if (!absentList.length) { box.innerHTML = "<p class='muted'>ไม่มีรายชื่อผู้ไม่เข้าร่วม</p>"; return; }

  const byDept    = groupByDept(absentList);
  const depts     = Object.keys(byDept).sort();
  const eventName = document.body.dataset.eventName || "";

  let html = `
    <div class="report-section-header">
      <h3>❌ รายชื่อผู้ไม่เข้าร่วม</h3>
      <span class="count-chip">${absentList.length} คน</span>
    </div>
    <div class="dept-accordion">`;

  depts.forEach((dept, di) => {
    const members = byDept[dept];
    html += `
      <div class="dept-row dept-pending" id="absent-dept-${di}" data-dept="${escapeHtml(dept)}">
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
      </div>`;
  });

  html += "</div>";
  box.innerHTML = html;
}

// ── Dept status — flat list, no accordion ─────────────────
function renderDeptStatus(submittedDepts, pendingDepts) {
  const box = document.getElementById("deptStatus");
  if (!box) return;
  const total = submittedDepts.length + pendingDepts.length;
  if (!total) { box.innerHTML = "<p class='muted'>ไม่มีข้อมูลแผนก</p>"; return; }

  let html = `
    <div class="report-section-header">
      <h3>📋 สถานะแผนกส่งยอด</h3>
      <span class="count-chip">${submittedDepts.length}/${total}</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:var(--space-2);">`;

  submittedDepts.forEach(d => {
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:var(--space-2) var(--space-3); background:var(--success-050);
                  border-radius:var(--radius-md); border:1px solid #b2f5ea;">
        <span style="font-weight:600;">${escapeHtml(d)}</span>
        <span class="badge badge-open">ส่งแล้ว</span>
      </div>`;
  });

  pendingDepts.forEach(d => {
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:var(--space-2) var(--space-3); background:var(--amber-050);
                  border-radius:var(--radius-md); border:1px solid #fbd38d;">
        <span style="font-weight:600;">${escapeHtml(d)}</span>
        <span class="badge badge-pending">ยังไม่ส่ง</span>
      </div>`;
  });

  html += "</div>";
  box.innerHTML = html;
}
