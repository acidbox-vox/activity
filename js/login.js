const boxes = () => Array.from(document.querySelectorAll(".code-box"));

window.onload = () => {
  // If already logged in this session, skip straight to the app.
  const auth = getAuth();
  if (auth.unitName) {
    location.href = "pages/activities.html";
    return;
  }
  wireBoxes();
  boxes()[0].focus();
};

function wireBoxes() {
  const all = boxes();

  all.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);
      if (box.value && i < all.length - 1) {
        all[i + 1].focus();
      }
      if (box.value && i === all.length - 1) {
        trySubmit();
      }
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        all[i - 1].focus();
      }
      if (e.key === "Enter") {
        trySubmit();
      }
    });

    box.addEventListener("paste", (e) => {
      const text = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "");
      if (!text) return;
      e.preventDefault();
      text.slice(0, all.length).split("").forEach((ch, j) => {
        if (all[j]) all[j].value = ch;
      });
      const next = Math.min(text.length, all.length) - 1;
      if (next >= 0) all[next].focus();
      if (text.length >= all.length) trySubmit();
    });
  });
}

function clearBoxes() {
  boxes().forEach(b => { b.value = ""; });
  boxes()[0].focus();
}

async function trySubmit() {
  const code = boxes().map(b => b.value).join("");
  const errorBox = document.getElementById("loginError");
  errorBox.textContent = "";

  if (code.length < boxes().length) return; // not all boxes filled yet

  const result = await api("checkUnitCode", { code });

  if (!result.success) {
    errorBox.textContent = result.message || "เบอร์หน่วยไม่ถูกต้อง";
    clearBoxes();
    return;
  }

  setUnitAuth(code, result.unitName);
  location.href = "pages/activities.html";
}
