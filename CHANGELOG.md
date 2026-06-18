# สรุปการแก้ไข (Activity System)

ไม่มีไฟล์ใดถูกลบ ทุกไฟล์เดิมยังอยู่ มีแก้ไขไฟล์เดิม 12 ไฟล์ และเพิ่มไฟล์ backend ใหม่ 4 ไฟล์ (เดิมไม่ได้รวมมาใน rar)

## แก้ไขไฟล์เดิม (frontend)

- **js/activityForm.js** — แก้จุดที่บล็อกทั้งระบบ: อ่าน `id` จาก URL, implement `submitReport()` ให้เก็บค่าจริงจากฟอร์มแล้วยิง `saveAttendance`, เปลี่ยน radio `name` จากชื่อพนักงานเป็น index (`emp_0`, `emp_1`, ...) เพื่อไม่ให้ชื่อซ้ำชนกัน, โหลด/แสดงชื่อ-สถานะกิจกรรม, ปิดปุ่มส่งยอดถ้ากิจกรรม CLOSED
- **js/activityReport.js** — เพิ่มการแสดงชื่อ/สถานะกิจกรรม และแสดงตาราง "รายชื่อผู้ไม่เข้าร่วม" (`absentList`) ที่ backend ส่งมาอยู่แล้วแต่หน้านี้ไม่เคยเอามาแสดง, เพิ่ม error handling
- **js/activities.js** — เพิ่ม error handling, badge สถานะ OPEN/CLOSED, ปุ่ม "ดูรายงาน" ที่ขาดไป, ปิดปุ่ม "ส่งยอด" ถ้ากิจกรรมปิดรับแล้ว, escape ข้อมูลก่อนแสดง
- **js/activityAdmin.js** — เพิ่ม validation ก่อนสร้างกิจกรรม (ห้ามชื่อ/วันที่ว่าง), เพิ่มตารางจัดการกิจกรรมที่มีอยู่ (เรียก `closeEvent`/`reopenEvent` ที่ backend มีแต่ไม่มี UI เรียกใช้มาก่อน) พร้อมลิงก์ไปหน้ารายงาน **[อัปเดต]** เปลี่ยนชื่อฟังก์ชัน `createEvent()` → `createNewEvent()` เพราะชื่อ `createEvent` ชนกับเมธอดมาตรฐานของเบราว์เซอร์ `Document.createEvent()` — ปุ่มที่เรียกผ่าน `onclick="..."` แบบ inline จะมองหาชื่อฟังก์ชันผ่านลำดับ element → form → **document** → window จึงไปเจอ `document.createEvent` ก่อนจะถึงฟังก์ชันของเราใน window ทำให้กดปุ่ม "สร้างกิจกรรม" แล้ว error `Failed to execute 'createEvent' on 'Document': 1 argument required, but only 0 present.` (อัปเดต `pages/activity-admin.html` ให้เรียกชื่อใหม่ด้วย)
- **js/api.js** — เพิ่ม try/catch ดัก network error ให้คืนค่า shape เดียวกับที่ทุกหน้าเช็คอยู่แล้ว (`success:false`), เพิ่ม helper กลาง `escapeHtml()` และ `getEventInfo()` **[อัปเดต]** เปลี่ยน `Content-Type` จาก `application/json` เป็น `text/plain;charset=utf-8` เพราะ Apps Script Web App ไม่รองรับ CORS preflight (`doOptions`) ถ้าส่ง header แบบ `application/json` เบราว์เซอร์จะส่ง preflight (`OPTIONS`) ก่อน แล้วถูกบล็อกจนกดปุ่มแล้วได้ "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" ฝั่ง backend ไม่ต้องแก้อะไรเพราะ `e.postData.contents` อ่าน raw text เหมือนเดิมไม่สนใจ header นี้ และแยก error message ระหว่าง "fetch ล้มเหลวจริงๆ" (เครือข่าย/CORS) กับ "ได้ response กลับมาแต่ไม่ใช่ JSON" (เช่น Apps Script ส่งหน้า login/ขอสิทธิ์กลับมา) ให้ขึ้นข้อความคนละแบบ ช่วย debug ง่ายขึ้น
- **css/activity.css** — เพิ่ม class ที่หน้าต่างๆ ใช้จริง (badge, table, ปุ่ม disabled, error text) แล้ว link เข้าทุกหน้า (เดิมไม่ได้ link ที่ไหนเลย)
- **index.html** — เพิ่มลิงก์ไปหน้ารายการกิจกรรม/หน้าแอดมิน (เดิมเป็นหน้าเปล่าไม่มีทางเข้าระบบ)
- **pages/activities.html**, **pages/activity-admin.html**, **pages/activity-form.html**, **pages/activity-report.html** — link css, เพิ่ม nav, เพิ่ม container ที่ JS ใหม่ต้องใช้ (`eventInfo`, `adminEventList`, `eventTitle`, `absentDetail`, `id="submitBtn"`)
- **js/apiConfig.js** — ไม่ได้แก้ (ไม่มีปัญหา)

## ไฟล์ backend ที่เพิ่มใหม่ (Google Apps Script)

ไฟล์เหล่านี้ไม่ได้อยู่ใน rar เดิม (มีแต่ frontend) เป็นโค้ดที่ส่งมาให้ดูในแชท แก้ไขแล้วและจัดเตรียมไว้ให้ก๊อปกลับเข้า Apps Script project:

- **backend/Code.gs** — เพิ่ม action `getEvent` (ดึงกิจกรรมเดียวด้วย id โดยไม่ต้องโหลดทั้งลิสต์)
- **backend/Events.gs** — `createEvent` validate ชื่อ/วันที่ว่าง และแปลง `eventDate`/`closeDate` เป็น Date object จริงก่อนเก็บ (เดิมเก็บเป็น string ดิบ), เพิ่มฟังก์ชัน `getEvent(eventId)`
- **backend/Attendance.gs** — `saveAttendance` เพิ่ม validate field ที่จำเป็น, เช็คว่ากิจกรรมต้องไม่ CLOSED ก่อนบันทึก, เช็คว่าแผนกนี้ยังไม่เคยส่งยอดของกิจกรรมนี้มาก่อน (กันส่งซ้ำ)
- **backend/Reports.gs** — ไม่มีบั๊ก คงไว้ตามเดิม ใส่มาให้ครบไฟล์เดียวกับที่แจ้งชื่อมา

## วิธีติดตั้ง

1. **Frontend**: เอาทั้งโฟลเดอร์ `activity-system/` (ยกเว้น `backend/`) ไปแทนที่ไฟล์เดิมบนเว็บได้เลย โครงสร้างไฟล์เหมือนเดิมทุกอย่าง
2. **Backend**: เปิด Apps Script project เดิม แล้ว copy เนื้อหาแต่ละไฟล์ใน `backend/*.gs` ไปแทนที่ไฟล์ชื่อเดียวกัน (Code.gs, Events.gs, Attendance.gs, Reports.gs) จากนั้น Deploy ใหม่ (Deploy > Manage deployments > Edit > New version)
