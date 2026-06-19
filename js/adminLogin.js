window.onload = () => {
  // Must already be logged in with a unit code before stepping up to admin.
  if (!requireUnitAuth()) return;

  // Already verified as admin this session -> skip straight through.
  if (getAuth().isAdmin) {
    location.href = "activity-admin.html";
    return;
  }

  document.getElementById("adminCodeInput").focus();
};

async function submitAdminCode() {
  const input = document.getElementById("adminCodeInput");
  const errorBox = document.getElementById("adminLoginError");
  const code = input.value.trim();
  errorBox.textContent = "";

  if (!code) {
    errorBox.textContent = "กรุณากรอกรหัสแอดมิน";
    return;
  }

  const result = await api("checkAdminCode", { code });

  if (!result.success) {
    errorBox.textContent = result.message || "รหัสแอดมินไม่ถูกต้อง";
    input.value = "";
    input.focus();
    return;
  }

  setAdminAuth(code);
  location.href = "activity-admin.html";
}
