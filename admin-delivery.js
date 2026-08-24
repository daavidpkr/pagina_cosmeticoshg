"use strict";
(function () {
  const root = document.querySelector("#admin-root"),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>\"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[c],
      );
  function content() {
    return root.querySelector("#admin-content");
  }
  function render() {
    const data = HGStore.load(),
      d = data.delivery,
      s = data.selection;
    content().innerHTML = `<section><div class="admin-heading"><div><p class="admin-kicker">Cobertura y consultas</p><h2>Entregas</h2></div><a class="admin-secondary" href="entregas/" target="_blank">Previsualizar página ↗</a></div><form class="delivery-admin"><fieldset><legend>Horarios generales</legend><label><input name="active" type="checkbox" ${d.active ? "checked" : ""}> Configuración activa</label><label>Días de atención (sun, mon, tue, wed, thu, fri, sat)<input name="serviceDays" value="${esc(d.serviceDays.join(", "))}"></label><label>Inicio<input name="startTime" type="time" value="${esc(d.startTime)}"></label><label>Fin<input name="endTime" type="time" value="${esc(d.endTime)}"></label><label>Pausas (HH:MM-HH:MM, una por línea)<textarea name="breaks">${esc(d.breaks.map((b) => `${b.start}-${b.end}`).join("\n"))}</textarea></label><label>Horario de entrega<input name="deliveryHours" value="${esc(d.deliveryHours)}"></label><label>Horario de retiro<input name="pickupHours" value="${esc(d.pickupHours)}"></label><label>Días no laborables (AAAA-MM-DD)<textarea name="closedDates">${esc(d.closedDates.join("\n"))}</textarea></label><label>Fechas especiales (AAAA-MM-DD|horario|mensaje)<textarea name="specialDates">${esc(d.specialDates.map((x) => `${x.date}|${x.hours || ""}|${x.message || ""}`).join("\n"))}</textarea></label><label>Mensaje dentro del horario<textarea name="insideMessage">${esc(d.insideMessage)}</textarea></label><label>Mensaje fuera del horario<textarea name="outsideMessage">${esc(d.outsideMessage)}</textarea></label><label>Condiciones generales<textarea name="generalConditions">${esc(d.generalConditions)}</textarea></label></fieldset><fieldset><legend>WhatsApp y selección</legend><label>Número de WhatsApp<input name="whatsappNumber" inputmode="tel" value="${esc(data.settings.whatsappNumber)}"></label><label><input name="selectionEnabled" type="checkbox" ${s.enabled ? "checked" : ""}> Consultar selección activo</label><label>Máximo de productos<input name="maxProducts" type="number" min="1" max="10" value="${s.maxProducts}"></label><label><input name="requireZone" type="checkbox" ${s.requireZone ? "checked" : ""}> Solicitar zona</label><label><input name="includePrices" type="checkbox" ${s.includePrices ? "checked" : ""}> Incluir precios</label><label><input name="includeAvailability" type="checkbox" ${s.includeAvailability ? "checked" : ""}> Incluir disponibilidad</label><label><input name="includeLinks" type="checkbox" ${s.includeLinks ? "checked" : ""}> Incluir enlaces</label><label>Mensaje inicial<textarea name="initialMessage">${esc(s.initialMessage)}</textarea></label><label>Mensaje final<textarea name="finalMessage">${esc(s.finalMessage)}</textarea></label></fieldset><button class="admin-primary">Guardar configuración</button></form><div class="admin-heading"><h3>Zonas</h3><button class="admin-primary add-zone">+ Crear zona</button></div><div class="commerce-admin-list">${data.deliveryZones
      .sort((a, b) => a.order - b.order)
      .map(
        (z) =>
          `<article><div><h3>${esc(z.name)}</h3><p>${z.active ? "Activa" : "Inactiva"} · orden ${z.order}</p></div><button data-edit="${z.id}">Editar</button><button data-toggle="${z.id}">${z.active ? "Desactivar" : "Activar"}</button><button data-delete="${z.id}">Eliminar</button></article>`,
      )
      .join("")}</div></section>`;
    const form = content().querySelector("form");
    form.onsubmit = (e) => {
      e.preventDefault();
      const f = e.currentTarget.elements;
      d.active = f.active.checked;
      d.serviceDays = HGStore.stringList(f.serviceDays.value);
      d.startTime = f.startTime.value;
      d.endTime = f.endTime.value;
      d.breaks = f.breaks.value
        .split(/\n/)
        .map((x) => x.trim().split("-"))
        .filter((x) => x.length === 2)
        .map(([start, end]) => ({ start, end }));
      d.deliveryHours = f.deliveryHours.value.trim();
      d.pickupHours = f.pickupHours.value.trim();
      d.closedDates = HGStore.stringList(f.closedDates.value);
      d.specialDates = f.specialDates.value
        .split(/\n/)
        .map((x) => x.trim().split("|"))
        .filter((x) => x[0])
        .map(([date, hours, message]) => ({
          date,
          hours: hours || "",
          message: message || "",
        }));
      d.insideMessage = f.insideMessage.value.trim();
      d.outsideMessage = f.outsideMessage.value.trim();
      d.generalConditions = f.generalConditions.value.trim();
      data.settings.whatsappNumber = f.whatsappNumber.value.replace(/\D/g, "");
      s.enabled = f.selectionEnabled.checked;
      s.maxProducts = Math.min(
        10,
        Math.max(1, Number(f.maxProducts.value) || 10),
      );
      s.requireZone = f.requireZone.checked;
      s.includePrices = f.includePrices.checked;
      s.includeAvailability = f.includeAvailability.checked;
      s.includeLinks = f.includeLinks.checked;
      s.initialMessage = f.initialMessage.value.trim();
      s.finalMessage = f.finalMessage.value.trim();
      HGStore.save(data);
      alert("Configuración guardada.");
      render();
    };
    content().querySelector(".add-zone").onclick = () => editZone();
    content()
      .querySelectorAll("[data-edit]")
      .forEach((b) => (b.onclick = () => editZone(b.dataset.edit)));
    content()
      .querySelectorAll("[data-toggle]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const z = data.deliveryZones.find((x) => x.id === b.dataset.toggle);
            z.active = !z.active;
            HGStore.save(data);
            render();
          }),
      );
    content()
      .querySelectorAll("[data-delete]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const z = data.deliveryZones.find((x) => x.id === b.dataset.delete);
            if (
              confirm(
                `Eliminar la zona "${z.name}"? Los respaldos o selecciones que la referencien dejarán de usarla.`,
              )
            ) {
              data.deliveryZones = data.deliveryZones.filter(
                (x) => x.id !== z.id,
              );
              HGStore.save(data);
              render();
            }
          }),
      );
  }
  function editZone(id) {
    const data = HGStore.load(),
      z = data.deliveryZones.find((x) => x.id === id),
      name = prompt("Nombre de la zona", z?.name || "")?.trim();
    if (!name) return;
    if (
      data.deliveryZones.some(
        (x) =>
          x.id !== id &&
          x.name.localeCompare(name, "es", { sensitivity: "base" }) === 0,
      )
    )
      return alert("Ya existe una zona con ese nombre.");
    const cost = prompt(
        "Costo (vacío = no configurado, 0 = sin costo)",
        z?.deliveryCost ?? "",
      ),
      minimum = prompt(
        "Compra mínima (vacío = no configurada)",
        z?.minimumPurchase ?? "",
      ),
      value = {
        id: z?.id || HGStore.uid("zone"),
        name,
        slug: HGStore.uniqueSlug(
          name,
          new Set(
            data.deliveryZones.filter((x) => x.id !== id).map((x) => x.slug),
          ),
        ),
        sectors: HGStore.stringList(
          prompt(
            "Sectores separados por coma",
            (z?.sectors || []).join(", "),
          ) || "",
        ),
        deliveryType:
          prompt(
            "Tipo: entrega, retiro o ambos",
            z?.deliveryType || "entrega",
          ) || "entrega",
        deliveryCost: cost === "" ? null : Number(cost),
        minimumPurchase: minimum === "" ? null : Number(minimum),
        estimatedTime: prompt("Tiempo estimado", z?.estimatedTime || "") || "",
        availableDays: HGStore.stringList(
          prompt("Días disponibles", (z?.availableDays || []).join(", ")) || "",
        ),
        conditions: prompt("Condiciones", z?.conditions || "") || "",
        active: z?.active !== false,
        order:
          Number(prompt("Orden", z?.order || data.deliveryZones.length + 1)) ||
          1,
      };
    z ? Object.assign(z, value) : data.deliveryZones.push(value);
    HGStore.save(data);
    render();
  }
  window.HGAdmin.registerSection("entregas", "Entregas", render);
})();
