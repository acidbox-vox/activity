window.onload =
loadDepartments;

async function loadDepartments(){

 const result =
 await api(
   "getDepartments"
 );

 const select =
 document
 .getElementById(
   "deptSelect"
 );

 result.data
 .forEach(d=>{

   select.innerHTML +=
   `<option>

   ${d}

   </option>`;

 });

}

async function loadDepartment(){

 const dept =
 document
 .getElementById(
   "deptSelect"
 ).value;

 const result =
 await api(
   "getDepartmentEmployees",
   {dept}
 );

 let html = `
 <table border="1">

 <tr>

 <th>ชื่อ</th>

 <th>เข้าร่วม</th>

 <th>ไม่เข้าร่วม</th>

 <th>เหตุผล</th>

 </tr>
 `;

 result.data
 .forEach(p=>{

 html += `

 <tr>

 <td>

 ${p.employee}

 </td>

 <td>

 <input
 type="radio"
 checked
 name="${p.employee}"
 value="เข้าร่วม">

 </td>

 <td>

 <input
 type="radio"
 name="${p.employee}"
 value="ไม่เข้าร่วม">

 </td>

 <td>

 <input
 type="text">

 </td>

 </tr>

 `;

 });

 html +=
 "</table>";

 document
 .getElementById(
  "personTable"
 ).innerHTML =
 html;

}

function submitReport(){

 alert(
 "รอเชื่อม API"
 );

}