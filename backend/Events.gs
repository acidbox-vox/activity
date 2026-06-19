function createEvent(data) {
  const adminCheck = requireAdmin(data.adminCode);
  if (adminCheck) return adminCheck;

  const eventName = (data.eventName || "").trim();
  if (!eventName) {
    return {
      success: false,
      message: "กรุณาระบุชื่อกิจกรรม"
    };
  }
  if (!data.eventDate) {
    return {
      success: false,
      message: "กรุณาระบุวันเวลาเริ่มกิจกรรม"
    };
  }

  const sh = SpreadsheetApp.getActive().getSheetByName("Events");
  const eventId = "EV" + Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyyMMddHHmmss"
  );

  // Store real Date objects instead of raw strings so the column
  // sorts/compares correctly in the sheet.
  const eventDate = new Date(data.eventDate);
  const closeDate = data.closeDate ? new Date(data.closeDate) : "";

  sh.appendRow([
    eventId,
    eventName,
    eventDate,
    closeDate,
    data.detail || "",
    "OPEN",
    new Date()
  ]);

  return {
    success: true,
    eventId
  };
}

function getEvents() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Events");
  const rows = sh.getDataRange().getValues();
  rows.shift();
  return {
    success: true,
    data: rows.map(r => ({
      id: r[0],
      name: r[1],
      eventDate: r[2],
      closeDate: r[3],
      detail: r[4],
      status: r[5]
    }))
  };
}

// Single-event lookup, used by the form/report pages so they don't
// have to fetch and filter the entire event list just to show one.
function getEvent(eventId) {
  const sh = SpreadsheetApp.getActive().getSheetByName("Events");
  const rows = sh.getDataRange().getValues();
  rows.shift();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === eventId) {
      const r = rows[i];
      return {
        success: true,
        data: {
          id: r[0],
          name: r[1],
          eventDate: r[2],
          closeDate: r[3],
          detail: r[4],
          status: r[5]
        }
      };
    }
  }
  return {
    success: false,
    message: "ไม่พบกิจกรรมนี้"
  };
}

function closeEvent(eventId, adminCode) {
  const adminCheck = requireAdmin(adminCode);
  if (adminCheck) return adminCheck;

  const sh = SpreadsheetApp.getActive().getSheetByName("Events");
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === eventId) {
      sh.getRange(i + 1, 6).setValue("CLOSED");
      return {
        success: true
      };
    }
  }
  return {
    success: false
  };
}

function reopenEvent(eventId, adminCode) {
  const adminCheck = requireAdmin(adminCode);
  if (adminCheck) return adminCheck;

  const sh = SpreadsheetApp.getActive().getSheetByName("Events");
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === eventId) {
      sh.getRange(i + 1, 6).setValue("OPEN");
      return {
        success: true
      };
    }
  }
  return {
    success: false
  };
}

function getDepartments() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Departments");
  const rows = sh.getDataRange().getValues();
  rows.shift();
  const depts = [...new Set(rows.map(r => r[0]))];
  return {
    success: true,
    data: depts
  };
}

function getDepartmentEmployees(dept) {
  const sh = SpreadsheetApp.getActive().getSheetByName("Departments");
  const rows = sh.getDataRange().getValues();
  rows.shift();
  const result = rows
    .filter(r => r[0] === dept)
    .map(r => ({
      department: r[0],
      employee: r[1]
    }));
  return {
    success: true,
    data: result
  };
}
