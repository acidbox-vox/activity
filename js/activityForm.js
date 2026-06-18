const params = new URLSearchParams(location.search);
const eventId = params.get("id");

let currentEmployees = []; // [{department, employee}] from the last "โหลดรายชื่อ" click

window.onload = init;

async function init() {

  if (!eventId) {
    document.getElementById("eventInfo").innerHTML =
      '<p class="error-text">ไม่พบรหัสกิจกรรม กรุณาเข้าหน้านี้จากรายการกิจกรรม</p>';
    document.getElementById("submitBtn").disabled = true;
    return;
  }

  loadDepartments();

  const ev = await getEventInfo(eventId);
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
  infoBox.innerHTML = `<h3>${escapeHtml(ev.name)} ${badge}</h3>`;

  if (isClosed) {
    document.getElementById("submitBtn").disabled = true;
    infoBox.innerHTML += '<p class="error-text">กิจกรรมนี้ปิดรับรายงานแล้ว ไม่สามารถส่งยอดได้</p>';
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
    select.innerHTML += `<option>${escapeHtml(d)}</option>`;
  });

}

async function loadDepartment() {

  const dept = document.getElementById("deptSelect").value;

  if (!dept || dept === "เลือกแผนก") {
    alert("กรุณาเลือกแผนก");
    return;
  }

  const result = await api("getDepartmentEmployees", { dept });

  if (!result.success) {
    alert("โหลดรายชื่อพนักงานไม่สำเร็จ: " + (result.message || result.error || ""));
    return;
  }

  currentEmployees = result.data;

  let html = `
  <table border="1">
    <tr>
      <th>ชื่อ</th>
      <th>เข้าร่วม</th>
      <th>ไม่เข้าร่วม</th>
      <th>เหตุผล</th>
    </tr>
  `;

  // Use the row index (not the employee's name) as the radio group key.
  // Two employees with the same display name would otherwise share one
  // radio group and clobber each other's selection.
  currentEmployees.forEach((p, i) => {
    html += `
      <tr>
        <td>${escapeHtml(p.employee)}</td>
        <td><input type="radio" checked name="emp_${i}" value="เข้าร่วม"></td>
        <td><input type="radio" name="emp_${i}" value="ไม่เข้าร่วม"></td>
        <td><input type="text" id="reason_${i}"></td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("personTable").innerHTML = html;

}

async function submitReport() {

  if (!eventId) {
    alert("ไม่พบรหัสกิจกรรม");
    return;
  }

  const dept = document.getElementById("deptSelect").value;

  if (!dept || dept === "เลือกแผนก") {
    alert("กรุณาเลือกแผนก");
    return;
  }

  if (!currentEmployees.length) {
    alert("กรุณากด \"โหลดรายชื่อ\" ก่อนส่งยอด");
    return;
  }

  const rows = currentEmployees.map((p, i) => {
    const checked = document.querySelector(`input[name="emp_${i}"]:checked`);
    const reason = document.getElementById(`reason_${i}`).value;
    return {
      employee: p.employee,
      status: checked ? checked.value : "เข้าร่วม",
      reason
    };
  });

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;

  const result = await api("saveAttendance", { eventId, department: dept, rows });

  if (result.success) {
    alert("ส่งยอดสำเร็จ");
    location.href = `activity-report.html?id=${encodeURIComponent(eventId)}`;
  } else {
    alert("ส่งยอดไม่สำเร็จ: " + (result.message || result.error || ""));
    submitBtn.disabled = false;
  }

}
