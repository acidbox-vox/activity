function saveAttendance(data) {
  const eventId = data.eventId;
  const department = data.department;
  const rows = data.rows;

  if (!eventId) {
    return {
      success: false,
      message: "ไม่พบรหัสกิจกรรม (eventId)"
    };
  }
  if (!department) {
    return {
      success: false,
      message: "กรุณาเลือกแผนก"
    };
  }
  if (!rows || !rows.length) {
    return {
      success: false,
      message: "ไม่พบรายชื่อพนักงานที่จะส่งยอด"
    };
  }

  // Guard 1: the event must still be OPEN.
  const eventsSh = SpreadsheetApp.getActive().getSheetByName("Events");
  const eventRows = eventsSh.getDataRange().getValues();
  let eventFound = false;
  for (let i = 1; i < eventRows.length; i++) {
    if (eventRows[i][0] === eventId) {
      eventFound = true;
      if (eventRows[i][5] === "CLOSED") {
        return {
          success: false,
          message: "กิจกรรมนี้ปิดรับรายงานแล้ว"
        };
      }
      break;
    }
  }
  if (!eventFound) {
    return {
      success: false,
      message: "ไม่พบกิจกรรมนี้"
    };
  }

  // Guard 2: this department must not have already submitted for
  // this event (prevents duplicate/accidental double submission).
  const submitSh = SpreadsheetApp.getActive().getSheetByName("EventSubmit");
  const submitRows = submitSh.getDataRange().getValues();
  for (let i = 1; i < submitRows.length; i++) {
    if (submitRows[i][0] === eventId && submitRows[i][1] === department) {
      return {
        success: false,
        message: "แผนกนี้ส่งยอดของกิจกรรมนี้ไปแล้ว"
      };
    }
  }

  const attendanceSh = SpreadsheetApp.getActive().getSheetByName("Attendance");
  rows.forEach(r => {
    attendanceSh.appendRow([
      eventId,
      department,
      r.employee,
      r.status,
      r.reason || "",
      new Date()
    ]);
  });

  submitSh.appendRow([
    eventId,
    department,
    data.user || "",
    new Date(),
    "SUBMITTED"
  ]);

  return {
    success: true
  };
}
