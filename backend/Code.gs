function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    let result = {};
    switch (req.action) {
      case "createEvent":            result = createEvent(req); break;
      case "updateEvent":            result = updateEvent(req); break;
      case "getEvents":              result = getEvents(); break;
      case "getEvent":               result = getEvent(req.eventId); break;
      case "checkUnitCode":          result = checkUnitCode(req.code); break;
      case "checkAdminCode":         result = checkAdminCode(req.code); break;
      case "getDepartments":         result = getDepartments(); break;
      case "getDepartmentEmployees": result = getDepartmentEmployees(req.dept); break;
      case "saveAttendance":         result = saveAttendance(req); break;
      case "getAttendance":          result = getAttendance(req); break;
      case "getEventSummary":        result = getEventSummary(req.eventId); break;
      case "closeEvent":             result = closeEvent(req.eventId, req.adminCode); break;
      case "reopenEvent":            result = reopenEvent(req.eventId, req.adminCode); break;
      default: result = { success: false, message: "Unknown Action" };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
