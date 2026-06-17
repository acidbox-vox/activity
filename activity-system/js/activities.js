window.onload =
loadEvents;

async function loadEvents(){

 const result =
 await api(
   "getEvents"
 );

 const box =
 document
 .getElementById(
   "eventList"
 );

 box.innerHTML = "";

 result.data.forEach(ev=>{

   box.innerHTML += `

   <div
   style="
   border:1px solid #ddd;
   padding:15px;
   margin:10px">

   <h3>
   ${ev.name}
   </h3>

   <div>

   วันที่ :
   ${ev.eventDate}

   </div>

   <br>

   <button
   onclick="
   location.href=
   'activity-form.html?id=${ev.id}'
   ">

   ส่งยอด

   </button>

   </div>

   `;

 });

}