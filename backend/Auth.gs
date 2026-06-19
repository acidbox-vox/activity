// Admin step-up code. Frontend sends this back on every privileged
// action (createEvent/closeEvent/reopenEvent) so the server -- not
// just the UI -- is the one enforcing it.
const ADMIN_CODE = "0910655667";

// Looks up a 5-digit unit extension against the "เบอร์หน่วย" sheet
// (col A = หน่วย / unit name, col B = เบอร์โทร / extension code).
// Compares as strings since the sheet may store the code as a number.
function checkUnitCode(code) {
  const normalized = String(code || "").trim();
  if (!normalized) {
    return { success: false, message: "กรุณากรอกเบอร์หน่วย" };
  }

  const sh = SpreadsheetApp.getActive().getSheetByName("เบอร์หน่วย");
  const rows = sh.getDataRange().getValues();
  rows.shift();

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === normalized) {
      return {
        success: true,
        unitName: rows[i][0]
      };
    }
  }

  return {
    success: false,
    message: "ไม่พบเบอร์หน่วยนี้ในระบบ"
  };
}

// Verifies the admin step-up code. Used both by the admin login page
// and as a guard inside createEvent/closeEvent/reopenEvent below.
function checkAdminCode(code) {
  if (String(code || "").trim() === ADMIN_CODE) {
    return { success: true };
  }
  return { success: false, message: "รหัสแอดมินไม่ถูกต้อง" };
}

// Throws-free helper for the write actions to call at their top.
// Returns null when the code is valid, or an error result to return
// immediately when it isn't.
function requireAdmin(adminCode) {
  const check = checkAdminCode(adminCode);
  if (!check.success) {
    return { success: false, message: "ไม่มีสิทธิ์ทำรายการนี้ (รหัสแอดมินไม่ถูกต้องหรือหายไป)" };
  }
  return null;
}
