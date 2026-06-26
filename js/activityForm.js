const params  = new URLSearchParams(location.search);
const eventId = params.get("id");

let currentEmployees = [];

window.onload = init;

async function init() {
  if (!eventId) {
    document.getElementById("eventInfo").innerHTML =
      '<p class="error-text">ไม่พบรหัสกิจกรรม กรุณาเข้าหน้านี้จากรายการกิจกรรม</p>';
    document.getElementById("submitBtn").disabled = true;
    return;
  }

  const [ev] = await Promise.all([getEventInfo(eventId), loadDepartments()]);
  const infoBox = document.getElementById("eventInfo");

  if (!ev) {
    infoBox.innerHTML = '<p class="error-text">ไม่พบกิจกรรมนี้</p>';
    document.getElementById("submitBtn").disabled = true;
    return;
  }

  const isClosed = ev.status === "CLOSED";
  const badge = isClosed
    ? '<span class="badge badge-closed">ปิดรับแล้ว</span>'
    : '<span class="badge badge-open">เปิดรับ</span>';
  infoBox.innerHTML = `
    <h3 style="margin:0 0 4px;">${escapeHtml(ev.name)} ${badge}</h3>
    <div class="muted" style="font-size:0.9rem;">📅 ${formatEventDateRange(ev.eventDate, ev.closeDate)}</div>
    ${ev.detail ? `<div class="muted" style="font-size:0.85rem; margin-top:4px;">${escapeHtml(ev.detail)}</div>` : ""}
  `;

  if (isClosed) {
    document.getElementById("submitBtn").disabled = true;
    infoBox.innerHTML += '<p class="error-text" style="margin-top:8px;">กิจกรรมนี้ปิดรับรายงานแล้ว ไม่สามารถส่งยอดได้</p>';
  }
}

async function loadDepartments() {
  const result = await api("getDepartments");
  const select = document.getElementById("deptSelect");

  if (!result.success) {
    alert("โหลดรายชื่อแผนกไม่สำเร็จ: " + (result.message || result.error || ""));
    return;
  }

  result.data.forEach(d => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = d;
    select.appendChild(opt);
  });

  const unitName = getAuth().unitName;
  if (unitName && result.data.includes(unitName)) {
    select.value = unitName;
  }
}

async function loadDepartment() {
  const dept = document.getElementById("deptSelect").value;
  if (!dept || dept === "เลือกแผนก") { alert("กรุณาเลือกแผนก"); return; }

  // Load employees and any previously submitted attendance in parallel
  const [empResult, attResult] = await Promise.all([
    api("getDepartmentEmployees", { dept }),
    api("getAttendance", { eventId, department: dept })
  ]);

  if (!empResult.success) {
    alert("โหลดรายชื่อพนักงานไม่สำเร็จ: " + (empResult.message || empResult.error || ""));
    return;
  }

  currentEmployees = empResult.data;

  // Build a lookup map of previous submission { employee -> {status, reason} }
  const prevMap = {};
  if (attResult.success && attResult.data.length) {
    attResult.data.forEach(r => { prevMap[r.employee] = r; });
    // Show notice that we loaded existing data
    document.getElementById("reloadNotice").style.display = "";
  } else {
    document.getElementById("reloadNotice").style.display = "none";
  }

  let html = `
    <div style="overflow-x:auto; margin-top:var(--space-4);">
    <table>
      <colgroup>
        <col style="width:40px">
        <col>
        <col style="width:90px">
        <col style="width:90px">
        <col style="width:160px">
      </colgroup>
      <tr>
        <th>#</th>
        <th>ชื่อ</th>
        <th>เข้าร่วม</th>
        <th>ไม่เข้าร่วม</th>
        <th>เหตุผล</th>
      </tr>
  `;

  currentEmployees.forEach((p, i) => {
    const prev    = prevMap[p.employee] || {};
    const isJoin  = !prev.status || prev.status === "เข้าร่วม";
    html += `
      <tr>
        <td style="text-align:center; color:var(--ink-400);">${i + 1}</td>
        <td>${escapeHtml(p.employee)}</td>
        <td style="text-align:center;"><input type="radio" ${isJoin ? "checked" : ""} name="emp_${i}" value="เข้าร่วม"></td>
        <td style="text-align:center;"><input type="radio" ${!isJoin ? "checked" : ""} name="emp_${i}" value="ไม่เข้าร่วม"></td>
        <td><input type="text" id="reason_${i}" placeholder="ระบุเหตุผล" value="${escapeHtml(prev.reason || "")}"></td>
      </tr>
    `;
  });

  html += "</table></div>";
  document.getElementById("personTable").innerHTML = html;
}

async function submitReport() {
  if (!eventId) { alert("ไม่พบรหัสกิจกรรม"); return; }

  const dept = document.getElementById("deptSelect").value;
  if (!dept || dept === "เลือกแผนก") { alert("กรุณาเลือกแผนก"); return; }
  if (!currentEmployees.length) { alert("กรุณากด \"โหลดรายชื่อ\" ก่อนส่งยอด"); return; }

  const rows = currentEmployees.map((p, i) => {
    const checked = document.querySelector(`input[name="emp_${i}"]:checked`);
    const reason  = document.getElementById(`reason_${i}`).value;
    return { employee: p.employee, status: checked ? checked.value : "เข้าร่วม", reason };
  });

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;

  const result = await api("saveAttendance", { eventId, department: dept, rows });

  if (result.success) {
    alert("ส่งยอดสำเร็จ ✓");
    location.href = `activities.html`;
  } else {
    alert("ส่งยอดไม่สำเร็จ: " + (result.message || result.error || ""));
    submitBtn.disabled = false;
  }
}
