async function createEvent(){

 const data = {

   eventName:
   document
   .getElementById(
      "eventName"
   ).value,

   eventDate:
   document
   .getElementById(
      "eventDate"
   ).value,

   closeDate:
   document
   .getElementById(
      "closeDate"
   ).value,

   detail:
   document
   .getElementById(
      "detail"
   ).value

 };

 const result =
 await api(
   "createEvent",
   data
 );

 if(result.success){

   alert(
    "สร้างกิจกรรมสำเร็จ"
   );

 }

}