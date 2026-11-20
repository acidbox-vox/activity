window.onload = loadSummary;

// Dept lists for print dialog
let _allDepts  = [];   // all dept names from current data
let _printMode = "all"; // current print type
let _roster    = null;  // full roster from Departments sheet (loaded on demand)

// ── Print dialog ────────────────────────────────────────
async function openPrintDialog(mode) {
  if (mode === "dept") { printMode("dept"); return; } // dept status has no dept filter

  // Roster mode: load every department + person from the Departments sheet,
  // independent of whether any unit has submitted attendance yet.
  let deptList = _allDepts;
  if (mode === "roster") {
    const ok = await ensureRosterLoaded();
    if (!ok) return;
    deptList = _roster.map(d => d.dept);
  }

  _printMode = mode;
  const label = mode === "roster" ? "รายชื่อทุกคน (ไม่ต้องรอส่งยอด)"
              : mode === "join" ? "ผู้เข้าร่วม"
              : mode === "absent" ? "ผู้ไม่เข้าร่วม"
              : mode === "byDept" ? "แยกแผนก (เข้าร่วม + ไม่เข้าร่วม)"
              : "ทั้งหมด";
  document.getElementById("dialogTitle").textContent = `เลือกแผนกที่ต้องการพิมพ์ — ${label}`;

  const list = document.getElementById("deptCheckboxList");
  list.innerHTML = deptList.map(d => `
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

  // Which report-sections will actually be visible for this mode
  const sectionsShown = mode === "all" ? ["join", "absent", "byDept", "dept"] : [mode];

  // Mark which dept-rows are included (per dept filter), force them open so
  // print can render their bodies, but remember rows that were already
  // closed on screen so we can restore that state afterward.
  document.querySelectorAll(".dept-row").forEach(r => {
    if (!r.classList.contains("open")) r.dataset.wasClosed = "1";
    r.classList.add("open");
    r.classList.remove("print-first-in-section");
    const deptName = r.dataset.dept || "";
    if (deptFilter) {
      r.dataset.printInclude = deptFilter.has(deptName) ? "1" : "0";
    } else {
      r.dataset.printInclude = "1";
    }
  });

  // For each visible section, find the first row that will actually be printed
  // (skipping any filtered-out rows ahead of it) and let it start on the
  // current page instead of forcing a page break before it.
  sectionsShown.forEach(sectionName => {
    const section = document.querySelector(`.report-section[data-section="${sectionName}"]`);
    if (!section) return;
    const firstVisible = [...section.querySelectorAll(".dept-row")]
      .find(r => r.dataset.printInclude !== "0");
    if (firstVisible) firstVisible.classList.add("print-first-in-section");
  });

  window.print();

  setTimeout(() => {
    document.body.removeAttribute("data-print-mode");
    document.querySelectorAll(".dept-row").forEach(r => {
      delete r.dataset.printInclude;
      r.classList.remove("print-first-in-section");
      // Collapse back any row that wasn't open before we printed
      if (r.dataset.wasClosed === "1") {
        r.classList.remove("open");
        delete r.dataset.wasClosed;
      }
    });
  }, 100);
}

// ── Full roster (every person in every department) ───────
async function ensureRosterLoaded() {
  if (_roster) return true;
  const res = await api("getAllRoster");
  if (!res.success) {
    alert("โหลดรายชื่อทั้งหมดไม่สำเร็จ: " + (res.message || res.error || ""));
    return false;
  }
  if (!res.data || !res.data.length) {
    alert("ไม่พบรายชื่อในชีต Departments");
    return false;
  }
  _roster = res.data;
  renderRoster(_roster);
  return true;
}

function renderRoster(roster) {
  const box = document.getElementById("rosterDetail");
  if (!box) return;
  const eventName = document.body.dataset.eventName || "";

  let html = '<div class="dept-accordion">';
  roster.forEach((d, di) => {
    const members = d.employees.map(n => ({ name: n }));
    html += `
      <div class="dept-row dept-mixed" id="roster-dept-${di}" data-dept="${escapeHtml(d.dept)}">
        <div class="dept-row-header">
          <div class="dept-row-title"><span>${escapeHtml(d.dept)}</span></div>
        </div>
        <div class="dept-row-body">
          <div class="dept-print-page-header">${escapeHtml(eventName)} — รายชื่อทั้งหมด — แผนก ${escapeHtml(d.dept)}</div>
          ${deptTable(members, false)}
          <div class="dept-print-summary">สรุป: รวม ${members.length} คน</div>
        </div>
      </div>`;
  });
  html += "</div>";
  box.innerHTML = html;
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
  renderByDeptList(joinList, absentList);
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

function collapseAllDepts(btn) {
  const section = btn.closest(".report-section");
  if (!section) return;
  section.querySelectorAll(".dept-row.open").forEach(r => r.classList.remove("open"));
}

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
      <div style="display:flex; align-items:center; gap:var(--space-2);">
        <span class="count-chip">${joinList.length} คน</span>
        <button class="secondary" style="font-size:0.78rem; padding:4px 10px;" onclick="collapseAllDepts(this)">🔽 พับทั้งหมด</button>
      </div>
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
      <div style="display:flex; align-items:center; gap:var(--space-2);">
        <span class="count-chip">${absentList.length} คน</span>
        <button class="secondary" style="font-size:0.78rem; padding:4px 10px;" onclick="collapseAllDepts(this)">🔽 พับทั้งหมด</button>
      </div>
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

// ── By-dept list — each dept shows both join & absent ─────
function renderByDeptList(joinList, absentList) {
  const box = document.getElementById("byDeptDetail");
  if (!box) return;
  if (!joinList.length && !absentList.length) {
    box.innerHTML = "<p class='muted'>ยังไม่มีข้อมูล</p>";
    return;
  }

  const byJoinDept   = groupByDept(joinList);
  const byAbsentDept = groupByDept(absentList);
  const deptSet = new Set([...Object.keys(byJoinDept), ...Object.keys(byAbsentDept)]);
  const depts = [...deptSet].sort();
  const eventName = document.body.dataset.eventName || "";

  let html = `
    <div class="report-section-header">
      <h3>🗂 ดูแยกตามแผนก (เข้าร่วม + ไม่เข้าร่วม)</h3>
      <div style="display:flex; align-items:center; gap:var(--space-2);">
        <span class="count-chip">${depts.length} แผนก</span>
        <button class="secondary" style="font-size:0.78rem; padding:4px 10px;" onclick="collapseAllDepts(this)">🔽 พับทั้งหมด</button>
      </div>
    </div>
    <div class="dept-accordion">`;

  depts.forEach((dept, di) => {
    const joinMembers   = byJoinDept[dept]   || [];
    const absentMembers = byAbsentDept[dept] || [];
    const total = joinMembers.length + absentMembers.length;

    html += `
      <div class="dept-row dept-mixed" id="byDept-dept-${di}" data-dept="${escapeHtml(dept)}">
        <div class="dept-row-header" onclick="toggleDept(this.parentElement)">
          <div class="dept-row-title"><span>${escapeHtml(dept)}</span></div>
          <div class="dept-row-meta">
            <span>${total} คน</span>
            <span class="badge badge-open">เข้าร่วม ${joinMembers.length}</span>
            <span class="badge badge-closed">ไม่เข้าร่วม ${absentMembers.length}</span>
            <span class="dept-chevron">▼</span>
          </div>
        </div>
        <div class="dept-row-body">
          <div class="dept-print-page-header">${escapeHtml(eventName)} — แยกแผนก — แผนก ${escapeHtml(dept)}</div>

          <div class="dept-subsection">
            <div class="dept-subsection-header join-subsection">✅ ผู้เข้าร่วม (${joinMembers.length} คน)</div>
            ${joinMembers.length ? deptTable(joinMembers, false) : "<p class='muted' style='margin:8px 0;'>ไม่มีผู้เข้าร่วม</p>"}
          </div>

          <div class="dept-subsection">
            <div class="dept-subsection-header absent-subsection">❌ ผู้ไม่เข้าร่วม (${absentMembers.length} คน)</div>
            ${absentMembers.length ? deptTable(absentMembers, true) : "<p class='muted' style='margin:8px 0;'>ไม่มีผู้ไม่เข้าร่วม</p>"}
          </div>

          <div class="dept-print-summary">สรุป: เข้าร่วม ${joinMembers.length} คน / ไม่เข้าร่วม ${absentMembers.length} คน / รวม ${total} คน</div>
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
