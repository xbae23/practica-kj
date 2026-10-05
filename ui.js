// Puedes cambiar este archivo junto con el diseño; no guarda datos.
const tabs = document.querySelectorAll("[data-tab]");
const forms = {
  registro: document.getElementById("form-registro"),
  entrada: document.getElementById("form-entrada")
};

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    const activa = tab.dataset.tab;
    for (const item of tabs) {
      const seleccionada = item.dataset.tab === activa;
      item.classList.toggle("active", seleccionada);
      item.setAttribute("aria-selected", String(seleccionada));
    }
    for (const [nombre, form] of Object.entries(forms)) form.hidden = nombre !== activa;
    document.getElementById("aviso").hidden = true;
  });
}

const initialTab = window.location.hash === "#entrada" ? "entrada" : "registro";
document.querySelector(`[data-tab="${initialTab}"]`)?.click();
