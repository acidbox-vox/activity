window.onload =
loadSummary;

async function loadSummary(){

 const params =
 new URLSearchParams(
 location.search
 );

 const eventId =
 params.get("id");

 const result =
 await api(
   "getEventSummary",
   {eventId}
 );

 document
 .getElementById(
   "summary"
 ).innerHTML = `

 <h3>

 เข้าร่วม

 ${result.join}

 </h3>

 <h3>

 ไม่เข้าร่วม

 ${result.absent}

 </h3>

 <h3>

 รวม

 ${result.total}

 </h3>

 `;

}