function getEventSummary(eventId) {
  const sh = SpreadsheetApp.getActive().getSheetByName("Attendance");
  const rows = sh.getDataRange().getValues();
  let join = 0;
  let absent = 0;
  const absentList = [];
  rows.forEach(r => {
    if (r[0] !== eventId) return;
    if (r[3] === "เข้าร่วม") {
      join++;
    } else {
      absent++;
      absentList.push({
        name: r[2],
        dept: r[1],
        reason: r[4]
      });
    }
  });
  return {
    success: true,
    join,
    absent,
    total: join + absent,
    absentList
  };
}
