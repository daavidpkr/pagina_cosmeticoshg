"use strict";
(function () {
  let faqDraft = [];
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  function renderFaqs(container) {
    container.innerHTML = faqDraft.length
      ? faqDraft
          .sort((a, b) => a.order - b.order)
          .map(
            (f, i) =>
              `<article data-faq="${f.id}"><label>Pregunta<input data-key="question" value="${esc(f.question)}" required></label><label>Respuesta<textarea data-key="answer" required>${esc(f.answer)}</textarea></label><label>Orden<input data-key="order" type="number" min="1" value="${f.order}"></label><label><input data-key="active" type="checkbox" ${f.active ? "checked" : ""}> Activa</label><button type="button" data-delete-faq="${f.id}">Eliminar</button></article>`,
          )
          .join("")
      : "<p>No hay preguntas registradas.</p>";
    container.querySelectorAll("input,textarea").forEach(
      (el) =>
        (el.oninput = () => {
          const faq = faqDraft.find(
            (f) => f.id === el.closest("[data-faq]").dataset.faq,
          );
          faq[el.dataset.key] =
            el.dataset.key === "active"
              ? el.checked
              : el.dataset.key === "order"
                ? Number(el.value)
                : el.value;
        }),
    );
    container.querySelectorAll("[data-delete-faq]").forEach(
      (b) =>
        (b.onclick = () => {
          if (confirm("¿Eliminar esta pregunta frecuente?")) {
            faqDraft = faqDraft.filter((f) => f.id !== b.dataset.deleteFaq);
            renderFaqs(container);
          }
        }),
    );
  }
  function enhanceDialog(dialog) {
    const form = dialog.querySelector("#product-form");
    if (!form || form.dataset.enhanced) return;
    form.dataset.enhanced = "true";
    const productId =
        dialog.closest("#admin-root")?.querySelector(".admin-dialog") &&
        document.querySelector(".admin-dialog").open
          ? null
          : null,
      data = HGStore.load(),
      name = form.elements.name.value,
      product = data.products.find((p) => p.name === name);
    faqDraft = HGStore.clone(product?.faqs || []);
    const fields = form.querySelector(".form-fields");
    fields.insertAdjacentHTML(
      "beforeend",
      `<fieldset class="inventory-fields"><legend>Inventario</legend><label>Modo<select name="inventoryMode"><option value="manual" ${product?.inventoryMode !== "quantity" ? "selected" : ""}>Manual</option><option value="quantity" ${product?.inventoryMode === "quantity" ? "selected" : ""}>Por cantidad</option></select></label><label>Cantidad<input name="stockQuantity" type="number" min="0" step="1" value="${product?.stockQuantity ?? 0}"></label><label>Límite de pocas unidades<input name="lowStockThreshold" type="number" min="0" step="1" value="${product?.lowStockThreshold ?? 0}"></label><label><input name="comingSoon" type="checkbox" ${product?.comingSoon ? "checked" : ""}> Próximamente</label></fieldset><fieldset class="faq-admin"><legend>Preguntas frecuentes</legend><div class="faq-admin-list"></div><button class="admin-secondary add-faq" type="button">Añadir pregunta</button></fieldset>`,
    );
    renderFaqs(fields.querySelector(".faq-admin-list"));
    fields.querySelector(".add-faq").onclick = () => {
      faqDraft.push({
        id: HGStore.uid("faq"),
        question: "",
        answer: "",
        active: true,
        order: faqDraft.length + 1,
      });
      renderFaqs(fields.querySelector(".faq-admin-list"));
    };
    form.addEventListener(
      "submit",
      (event) => {
        const invalid = faqDraft.some(
          (f) => !f.question.trim() || !f.answer.trim(),
        );
        if (invalid) {
          event.preventDefault();
          event.stopImmediatePropagation();
          form.querySelector(".form-error").textContent =
            "Completa la pregunta y respuesta de cada FAQ.";
          return;
        }
        const values = {
          name: form.elements.name.value,
          inventoryMode: form.elements.inventoryMode.value,
          stockQuantity: Number(form.elements.stockQuantity.value),
          lowStockThreshold: Number(form.elements.lowStockThreshold.value),
          comingSoon: form.elements.comingSoon.checked,
          faqs: HGStore.clone(faqDraft),
        };
        if (
          !Number.isInteger(values.stockQuantity) ||
          values.stockQuantity < 0 ||
          !Number.isInteger(values.lowStockThreshold) ||
          values.lowStockThreshold < 0
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          form.querySelector(".form-error").textContent =
            "El inventario debe usar números enteros iguales o mayores a cero.";
          return;
        }
        queueMicrotask(() => {
          const saved = HGStore.load(),
            p = saved.products.find((p) => p.name === values.name);
          if (!p) return;
          Object.assign(p, values);
          p.availability = HGStore.getInventoryStatus(p);
          HGStore.save(saved);
        });
      },
      true,
    );
  }
  function renderSettings() {
    const content = document.querySelector("#admin-content"),
      settings = HGStore.load().settings;
    if (!content) return;
    content.innerHTML = `<section><div class="admin-heading"><div><p class="admin-kicker">Configuración</p><h2>WhatsApp</h2></div></div><form class="whatsapp-settings"><label>Número con código de país<input name="number" value="${esc(settings.whatsappNumber)}" placeholder="Ej.: 593999999999"></label><label>Mensaje general<textarea name="message" rows="3">${esc(settings.whatsappMessage)}</textarea></label><label><input name="enabled" type="checkbox" ${settings.whatsappFloatingEnabled ? "checked" : ""}> Activar botón flotante</label><p>Si no hay número configurado, el botón permanecerá oculto.</p><button class="admin-primary">Guardar configuración</button></form></section>`;
    content.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const d = HGStore.load();
      d.settings.whatsappNumber = e.currentTarget.elements.number.value.replace(
        /\D/g,
        "",
      );
      d.settings.whatsappMessage =
        e.currentTarget.elements.message.value.trim();
      d.settings.whatsappFloatingEnabled =
        e.currentTarget.elements.enabled.checked;
      HGStore.save(d);
    };
  }
  function enhanceShell() {
    document.querySelectorAll(".admin-dialog").forEach(enhanceDialog);
  }
  window.HGAdmin.registerSection(
    "configuracion",
    "Configuración",
    renderSettings,
  );
  new MutationObserver(enhanceShell).observe(
    document.querySelector("#admin-root"),
    { childList: true, subtree: true },
  );
  enhanceShell();
})();
const adminCommerce = document.createElement("script");
adminCommerce.src = "admin-commerce.js?v=7";
adminCommerce.defer = true;
adminCommerce.onload = () => {
  const editorial = document.createElement("script");
  editorial.src = "admin-editorial.js?v=7";
  document.head.append(editorial);
};
document.head.append(adminCommerce);
