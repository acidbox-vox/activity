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

// Full roster of every department straight from the "Departments" sheet
// (col A = แผนก/หน่วย, col B = ชื่อ). Does NOT depend on Attendance or
// EventSubmit, so it works even when no department has submitted yet.
// Returns departments in sheet order, each with its people in sheet order.
function getAllRoster() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Departments");
  const rows = sh.getDataRange().getValues();
  rows.shift();

  const order = [];
  const map = {};
  rows.forEach(r => {
    const dept = String(r[0] || "").trim();
    const name = String(r[1] || "").trim();
    if (!dept || !name) return;
    if (!map[dept]) { map[dept] = []; order.push(dept); }
    map[dept].push(name);
  });

  const data = order.map(d => ({ dept: d, employees: map[d] }));
  const total = data.reduce((n, d) => n + d.employees.length, 0);
  return { success: true, data, total };
}
