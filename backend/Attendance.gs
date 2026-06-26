function saveAttendance(data) {
  const eventId    = data.eventId;
  const department = data.department;
  const rows       = data.rows;

  if (!eventId)    return { success: false, message: "ไม่พบรหัสกิจกรรม (eventId)" };
  if (!department) return { success: false, message: "กรุณาเลือกแผนก" };
  if (!rows || !rows.length) return { success: false, message: "ไม่พบรายชื่อที่จะส่งยอด" };

  // Guard: event must be OPEN
  const eventsSh  = SpreadsheetApp.getActive().getSheetByName("Events");
  const eventRows = eventsSh.getDataRange().getValues();
  let eventFound  = false;
  for (let i = 1; i < eventRows.length; i++) {
    if (eventRows[i][0] === eventId) {
      eventFound = true;
      if (eventRows[i][5] === "CLOSED") return { success: false, message: "กิจกรรมนี้ปิดรับรายงานแล้ว" };
      break;
    }
  }
  if (!eventFound) return { success: false, message: "ไม่พบกิจกรรมนี้" };

  // Delete existing rows for this eventId+department (allow re-submission)
  const attendanceSh = SpreadsheetApp.getActive().getSheetByName("Attendance");
  const attRows      = attendanceSh.getDataRange().getValues();
  // Collect row indices to delete (descending so deleting doesn't shift indices)
  const toDelete = [];
  for (let i = 1; i < attRows.length; i++) {
    if (attRows[i][0] === eventId && attRows[i][1] === department) toDelete.push(i + 1);
  }
  for (let i = toDelete.length - 1; i >= 0; i--) {
    attendanceSh.deleteRow(toDelete[i]);
  }

  // Write new rows
  rows.forEach(r => {
    attendanceSh.appendRow([eventId, department, r.employee, r.status, r.reason || "", new Date()]);
  });

  // Upsert EventSubmit — remove old record then append new
  const submitSh   = SpreadsheetApp.getActive().getSheetByName("EventSubmit");
  const submitRows = submitSh.getDataRange().getValues();
  const toDeleteS  = [];
  for (let i = 1; i < submitRows.length; i++) {
    if (submitRows[i][0] === eventId && submitRows[i][1] === department) toDeleteS.push(i + 1);
  }
  for (let i = toDeleteS.length - 1; i >= 0; i--) submitSh.deleteRow(toDeleteS[i]);
  submitSh.appendRow([eventId, department, data.user || "", new Date(), "SUBMITTED"]);

  return { success: true };
}

function getAttendance(data) {
  const { eventId, department } = data;
  if (!eventId || !department) return { success: false, message: "ข้อมูลไม่ครบ" };

  const sh   = SpreadsheetApp.getActive().getSheetByName("Attendance");
  const rows = sh.getDataRange().getValues();
  rows.shift();
  const result = rows
    .filter(r => r[0] === eventId && r[1] === department)
    .map(r => ({ employee: r[2], status: r[3], reason: r[4] }));

  return { success: true, data: result };
}
