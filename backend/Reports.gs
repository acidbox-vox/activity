function getEventSummary(eventId) {
  const sh = SpreadsheetApp.getActive().getSheetByName("Attendance");
  const rows = sh.getDataRange().getValues();
  let join = 0;
  let absent = 0;
  const joinList = [];
  const absentList = [];
  rows.forEach(r => {
    if (r[0] !== eventId) return;
    if (r[3] === "เข้าร่วม") {
      join++;
      joinList.push({ name: r[2], dept: r[1] });
    } else {
      absent++;
      absentList.push({ name: r[2], dept: r[1], reason: r[4] });
    }
  });

  // Which departments have submitted for this event, and which
  // haven't yet -- cross-reference the full department list against
  // EventSubmit rows for this specific eventId.
  const deptSh = SpreadsheetApp.getActive().getSheetByName("Departments");
  const deptRows = deptSh.getDataRange().getValues();
  deptRows.shift();
  const allDepts = [...new Set(deptRows.map(r => r[0]))];

  const submitSh = SpreadsheetApp.getActive().getSheetByName("EventSubmit");
  const submitRows = submitSh.getDataRange().getValues();
  const submittedSet = new Set();
  submitRows.forEach(r => {
    if (r[0] === eventId) submittedSet.add(r[1]);
  });

  const submittedDepts = allDepts.filter(d => submittedSet.has(d));
  const pendingDepts = allDepts.filter(d => !submittedSet.has(d));

  return {
    success: true,
    join,
    absent,
    total: join + absent,
    joinList,
    absentList,
    submittedDepts,
    pendingDepts
  };
}
