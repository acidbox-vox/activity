// Session shape (sessionStorage, cleared when the browser tab closes):
//   unitCode  - the 5-digit code the person logged in with
//   unitName  - the resolved หน่วย name from the "เบอร์หน่วย" sheet
//   isAdmin   - "1" once they've passed the admin step-up code
//   adminCode - the verified admin code, re-sent on every admin
//               write action so the backend can check it too

function getAuth() {
  return {
    unitCode: sessionStorage.getItem("unitCode") || "",
    unitName: sessionStorage.getItem("unitName") || "",
    isAdmin: sessionStorage.getItem("isAdmin") === "1",
    adminCode: sessionStorage.getItem("adminCode") || ""
  };
}

function setUnitAuth(unitCode, unitName) {
  sessionStorage.setItem("unitCode", unitCode);
  sessionStorage.setItem("unitName", unitName);
}

function setAdminAuth(adminCode) {
  sessionStorage.setItem("isAdmin", "1");
  sessionStorage.setItem("adminCode", adminCode);
}

function logoutAndRedirect() {
  sessionStorage.clear();
  location.href = loginPath();
}

// Protected pages live under /pages/, the login page is the repo root.
function loginPath() {
  return location.pathname.includes("/pages/") ? "../index.html" : "index.html";
}

function adminLoginPath() {
  return location.pathname.includes("/pages/") ? "admin-login.html" : "pages/admin-login.html";
}

// Call at the very top of any page that requires a logged-in unit.
// Returns the auth object, or null after triggering a redirect.
function requireUnitAuth() {
  const auth = getAuth();
  if (!auth.unitName) {
    location.href = loginPath();
    return null;
  }
  return auth;
}

// Call at the very top of admin-only pages. A unit must be logged in
// AND have passed the admin step-up code.
function requireAdminAuth() {
  const auth = getAuth();
  if (!auth.unitName) {
    location.href = loginPath();
    return null;
  }
  if (!auth.isAdmin) {
    location.href = adminLoginPath();
    return null;
  }
  return auth;
}
