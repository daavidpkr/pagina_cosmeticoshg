(function () {
  "use strict";
  // PROTOTIPO LOCAL: esta contraseña en cliente NO es seguridad real. Sustituir por Supabase Auth antes de publicar.
  const TEMP_PASSWORD = "cosmeticoshg2026",
    SESSION_KEY = "hgAdminSession";
  const root = document.querySelector("#admin-root");
  let section = "resumen",
    editingId = null,
    imageValue = "",
    renderingSection = false;
  const ADMIN_SECTIONS = {};
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const norm = (v) =>
    String(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const categoryName = (data, id) =>
    data.categories.find((c) => c.id === id)?.name || "Sin categoría";
  function panelRoute() {
    return /^#panelcontrol(?:\/|$)/.test(location.hash.toLowerCase());
  }
  function sectionFromRoute() {
    const id = decodeURIComponent(
      location.hash.slice(1).split("/")[1] || "",
    ).toLowerCase();
    return ADMIN_SECTIONS[id] ? id : "resumen";
  }
  function storeSession(value) {
    if (value) sessionStorage.setItem(SESSION_KEY, "active");
    else sessionStorage.removeItem(SESSION_KEY);
  }
  function route() {
    if (typeof window.refreshStorefront === "function")
      window.refreshStorefront();
    const panel = panelRoute();
    document.body.classList.toggle("admin-mode", panel);
    if (!panel) {
      root.innerHTML = "";
      return;
    }
    section = sectionFromRoute();
    sessionStorage.getItem(SESSION_KEY) === "active"
      ? renderPanel()
      : renderLogin();
  }
  function renderLogin() {
    root.innerHTML = `<main class="admin-login"><section class="login-card" aria-labelledby="login-title"><img src="assets/images/logo-cosmeticos-hg.webp" alt="Cosméticos HG" width="88" height="88"><p class="admin-kicker">Acceso privado</p><h1 id="login-title">Panel de control</h1><p>Ingresa tus credenciales para administrar el catálogo.</p><form id="login-form"><label for="admin-password">Contraseña</label><div class="password-field"><input id="admin-password" type="password" autocomplete="current-password" required autofocus><button type="button" id="toggle-password" aria-label="Mostrar contraseña">Mostrar</button></div><p class="login-error" role="alert"></p><button class="admin-primary" type="submit">Ingresar al panel</button></form><button class="admin-text-button back-store" type="button">← Volver a la tienda</button></section></main>`;
    root.querySelector("#toggle-password").onclick = (e) => {
      const input = root.querySelector("#admin-password"),
        show = input.type === "password";
      input.type = show ? "text" : "password";
      e.currentTarget.textContent = show ? "Ocultar" : "Mostrar";
      e.currentTarget.setAttribute(
        "aria-label",
        show ? "Ocultar contraseña" : "Mostrar contraseña",
      );
    };
    root.querySelector("#login-form").onsubmit = (e) => {
      e.preventDefault();
      if (root.querySelector("#admin-password").value === TEMP_PASSWORD) {
        storeSession(true);
        section = sectionFromRoute();
        renderPanel();
      } else {
        root.querySelector(".login-error").textContent =
          "La contraseña es incorrecta. Inténtalo nuevamente.";
        root.querySelector("#admin-password").select();
      }
    };
    root.querySelector(".back-store").onclick = goStore;
  }
  function goStore() {
    history.pushState(null, "", location.pathname + location.search);
    if (typeof window.refreshStorefront === "function")
      window.refreshStorefront();
    route();
  }
  function menuHtml() {
    return Object.entries(ADMIN_SECTIONS)
      .map(
        ([id, item]) =>
          `<button type="button" data-admin-section="${id}">${esc(item.label)}</button>`,
      )
      .join("");
  }
  function syncAdminMenu() {
    const nav = root.querySelector(".admin-sidebar nav");
    if (nav) nav.innerHTML = menuHtml();
    updateActiveMenu();
  }
  function shell() {
    root.innerHTML = `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><img src="assets/images/logo-cosmeticos-hg.webp" alt="" width="48" height="48"><span>Cosméticos <b>HG</b><small>Administración</small></span></div><nav aria-label="Panel administrativo"><button data-section="dashboard">Resumen</button><button data-section="products">Productos</button><button data-section="categories">Categorías</button><button data-section="backup">Respaldo</button></nav><div class="sidebar-actions"><button class="admin-text-button view-store">Ver tienda ↗</button><button class="admin-text-button logout">Cerrar sesión</button></div></aside><header class="admin-mobile-head"><div class="admin-brand"><img src="assets/images/logo-cosmeticos-hg.webp" alt="" width="40" height="40"><span>Panel HG</span></div><button class="admin-menu" aria-expanded="false">Menú</button></header><div class="admin-workspace"><header class="admin-topbar"><div><p class="admin-kicker">Catálogo local</p><h1>Panel de control</h1></div><button class="admin-primary quick-add">+ Nuevo producto</button></header><main class="admin-content" id="admin-content"></main></div><div class="admin-toast" role="status" aria-live="polite"></div></div><dialog class="admin-dialog" id="product-dialog"></dialog>`;
    const nav = root.querySelector(".admin-sidebar nav");
    nav.innerHTML = menuHtml();
    nav.onclick = (e) => {
      const item = e.target.closest("[data-admin-section]");
      if (item) selectAdminSection(item.dataset.adminSection, { focus: item });
    };
    root.querySelector(".quick-add").onclick = () => openProduct();
    root.querySelector(".view-store").onclick = goStore;
    root.querySelector(".logout").onclick = () => {
      storeSession(false);
      renderLogin();
    };
    root.querySelector(".admin-menu").onclick = (e) => {
      const side = root.querySelector(".admin-sidebar"),
        open = !side.classList.contains("is-open");
      side.classList.toggle("is-open", open);
      e.currentTarget.setAttribute("aria-expanded", String(open));
    };
  }
  function renderPanel() {
    shell();
    renderSection();
  }
  function updateActiveMenu() {
    root.querySelectorAll("[data-admin-section]").forEach((button) => {
      const active = button.dataset.adminSection === section;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  function renderSection() {
    if (renderingSection) return;
    const item = ADMIN_SECTIONS[section] || ADMIN_SECTIONS.resumen;
    if (!item) return;
    renderingSection = true;
    try {
      updateActiveMenu();
      item.render();
    } finally {
      renderingSection = false;
    }
  }
  function selectAdminSection(id, { focus = null, replace = false } = {}) {
    if (!ADMIN_SECTIONS[id]) id = "resumen";
    const changed = section !== id;
    section = id;
    updateActiveMenu();
    if (changed || !root.querySelector("#admin-content")?.hasChildNodes())
      renderSection();
    const hash = `#panelcontrol/${id}`;
    if (location.hash !== hash)
      history[replace ? "replaceState" : "pushState"](null, "", hash);
    root.querySelector(".admin-sidebar")?.classList.remove("is-open");
    root.querySelector(".admin-menu")?.setAttribute("aria-expanded", "false");
    if (focus && document.contains(focus)) focus.focus();
  }
  function registerAdminSection(id, label, render) {
    if (!/^[a-z0-9-]+$/.test(id) || ADMIN_SECTIONS[id])
      throw new Error(`Sección administrativa inválida o duplicada: ${id}`);
    if (typeof render !== "function")
      throw new TypeError(`La sección ${id} no tiene función de renderizado`);
    ADMIN_SECTIONS[id] = { label, render };
    syncAdminMenu();
    const requested = decodeURIComponent(
      location.hash.slice(1).split("/")[1] || "",
    ).toLowerCase();
    if (
      requested === id &&
      sessionStorage.getItem(SESSION_KEY) === "active" &&
      root.querySelector("#admin-content")
    ) {
      section = id;
      renderSection();
    }
  }
  function replaceAdminSection(id, label, render) {
    if (!ADMIN_SECTIONS[id] || typeof render !== "function")
      throw new Error(`No se puede reemplazar la sección administrativa: ${id}`);
    ADMIN_SECTIONS[id] = { label, render };
    syncAdminMenu();
    if (section === id && root.querySelector("#admin-content")) renderSection();
  }
  function verifyAdminNavigation() {
    const errors = [],
      ids = Object.keys(ADMIN_SECTIONS);
    if (new Set(ids).size !== ids.length)
      errors.push("Hay identificadores duplicados.");
    ids.forEach((id) => {
      if (typeof ADMIN_SECTIONS[id].render !== "function")
        errors.push(`${id} no tiene render válido.`);
    });
    const buttons = [...root.querySelectorAll("[data-admin-section]")];
    buttons.forEach((button) => {
      if (!ADMIN_SECTIONS[button.dataset.adminSection])
        errors.push(`${button.dataset.adminSection} no está registrada.`);
    });
    const active = buttons.filter((button) =>
      button.classList.contains("is-active"),
    );
    if (active.length > 1) errors.push("Hay más de una pestaña activa.");
    if (active.length === 1 && active[0].dataset.adminSection !== section)
      errors.push("La pestaña activa no coincide con el contenido.");
    return {
      ok: errors.length === 0,
      currentSection: section,
      sections: ids,
      activeCount: active.length,
      errors,
    };
  }
  function stats(data) {
    const status = (value) =>
      data.products.filter((p) => HGStore.getInventoryStatus(p) === value)
        .length;
    return [
      { label: "Total de productos", value: data.products.length },
      { label: "Disponibles", value: status("disponible") },
      { label: "Pocas unidades", value: status("pocas") },
      { label: "Agotados", value: status("agotado") },
      { label: "Próximamente", value: status("proximo") },
      {
        label: "Unidades registradas",
        value: data.products
          .filter((p) => p.inventoryMode === "quantity")
          .reduce((sum, p) => sum + p.stockQuantity, 0),
      },
    ];
  }
  function renderDashboard() {
    const data = HGStore.load(),
      content = root.querySelector("#admin-content");
    content.innerHTML = `<section><div class="admin-heading"><div><p class="admin-kicker">Vista general</p><h2>Resumen del catálogo</h2></div><span>Actualizado ${new Date().toLocaleDateString("es-EC")}</span></div><div class="stat-grid">${stats(
      data,
    )
      .map(
        (s, i) =>
          `<article><span>0${i + 1}</span><strong>${s.value}</strong><p>${s.label}</p></article>`,
      )
      .join(
        "",
      )}</div><h3 class="block-title">Accesos rápidos</h3><div class="quick-grid"><button data-quick="add"><b>＋</b><span>Crear producto<small>Añadir al catálogo</small></span></button><button data-quick="products"><b>⌘</b><span>Administrar productos<small>Editar y organizar</small></span></button><button data-quick="categories"><b>◇</b><span>Administrar categorías<small>Ordenar filtros</small></span></button><button data-quick="backup"><b>⇩</b><span>Realizar respaldo<small>Exportar datos</small></span></button></div></section>`;
    content.querySelectorAll("[data-quick]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.quick === "add") openProduct();
          else {
            const targets = {
              products: "productos",
              categories: "categorias",
              backup: "respaldo",
            };
            selectAdminSection(targets[b.dataset.quick]);
          }
        }),
    );
  }
  function renderProducts() {
    const content = root.querySelector("#admin-content"),
      data = HGStore.load();
    content.innerHTML = `<section><div class="admin-heading"><div><p class="admin-kicker">Inventario</p><h2>Productos</h2></div><button class="admin-primary add-product">+ Añadir producto</button></div><div class="admin-filters"><input id="admin-search" type="search" placeholder="Buscar por nombre, marca o descripción" aria-label="Buscar productos"><select id="admin-category" aria-label="Filtrar categoría"><option value="">Todas las categorías</option>${data.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select><select id="admin-availability" aria-label="Filtrar disponibilidad"><option value="">Toda disponibilidad</option><option value="disponible">Disponible</option><option value="agotado">Agotado</option><option value="proximo">Próximo a llegar</option></select><select id="admin-state" aria-label="Filtrar estado"><option value="">Activos e inactivos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select><select id="admin-sort" aria-label="Ordenar productos"><option value="order">Orden de presentación</option><option value="name">Nombre A–Z</option><option value="updated">Última modificación</option></select></div><div class="admin-product-list"></div></section>`;
    content.querySelector(".add-product").onclick = () => openProduct();
    content
      .querySelectorAll(".admin-filters input,.admin-filters select")
      .forEach((el) => (el.oninput = paintProductList));
    paintProductList();
  }
  function paintProductList() {
    const data = HGStore.load(),
      content = root.querySelector("#admin-content");
    if (!content?.querySelector(".admin-product-list")) return;
    const q = norm(content.querySelector("#admin-search").value),
      cat = content.querySelector("#admin-category").value,
      avail = content.querySelector("#admin-availability").value,
      state = content.querySelector("#admin-state").value,
      sort = content.querySelector("#admin-sort").value;
    let list = data.products.filter(
      (p) =>
        (!q ||
          norm(`${p.name} ${p.brand} ${p.shortDescription}`).includes(q)) &&
        (!cat || p.categoryId === cat) &&
        (!avail || p.availability === avail) &&
        (!state || (state === "active") === p.active),
    );
    list.sort(
      sort === "name"
        ? (a, b) => a.name.localeCompare(b.name)
        : sort === "updated"
          ? (a, b) => b.updatedAt.localeCompare(a.updatedAt)
          : (a, b) => a.order - b.order,
    );
    content.querySelector(".admin-product-list").innerHTML = list.length
      ? list
          .map(
            (p) =>
              `<article class="admin-product-card"><div class="admin-thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<span>${esc(p.name.slice(0, 1))}</span>`}</div><div class="admin-product-main"><div><span class="state ${p.active ? "active" : "inactive"}">${p.active ? "Activo" : "Inactivo"}</span><span class="availability">${p.availability === "proximo" ? "Próximo" : p.availability}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.brand)} · ${esc(categoryName(data, p.categoryId))}</p></div><div class="admin-product-meta"><small>Orden</small><strong>${p.order}</strong></div><div class="admin-card-actions"><button data-action="toggle" data-id="${p.id}">${p.active ? "Desactivar" : "Activar"}</button><button data-action="feature" data-id="${p.id}">${p.featured ? "★ Destacado" : "☆ Destacar"}</button><button data-action="edit" data-id="${p.id}">Editar</button><button class="danger" data-action="delete" data-id="${p.id}">Eliminar</button></div></article>`,
          )
          .join("")
      : '<p class="admin-empty">No hay productos que coincidan con los filtros.</p>';
    content.querySelector(".admin-product-list").onclick = productAction;
  }
  function productAction(e) {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const data = HGStore.load(),
      p = data.products.find((x) => x.id === b.dataset.id);
    if (!p) return;
    if (b.dataset.action === "edit") return openProduct(p.id);
    if (b.dataset.action === "delete") {
      if (
        !confirm(`¿Eliminar “${p.name}”? Esta acción no se puede deshacer.`) ||
        !confirm("Confirmación final: ¿eliminar definitivamente este producto?")
      )
        return;
      data.products = data.products.filter((x) => x.id !== p.id);
    } else if (b.dataset.action === "toggle") {
      p.active = !p.active;
      p.updatedAt = new Date().toISOString();
    } else if (b.dataset.action === "feature") {
      p.featured = !p.featured;
      p.updatedAt = new Date().toISOString();
    }
    HGStore.save(data);
    paintProductList();
    toast("Catálogo actualizado.");
  }
  function openProduct(id = null) {
    editingId = id;
    const data = HGStore.load(),
      p = id ? data.products.find((x) => x.id === id) : null;
    imageValue = p?.image || "";
    const dialog = root.querySelector("#product-dialog");
    dialog.innerHTML = `<form id="product-form" method="dialog"><div class="dialog-head"><div><p class="admin-kicker">${p ? "Editar" : "Crear"}</p><h2>${p ? "Editar producto" : "Nuevo producto"}</h2></div><button type="button" class="dialog-close" aria-label="Cerrar">×</button></div><div class="form-layout"><div class="form-fields"><label>Nombre *<input name="name" required maxlength="80" value="${esc(p?.name)}"></label><div class="field-pair"><label>Categoría *<select name="categoryId" required><option value="">Seleccionar</option>${data.categories
      .filter((c) => c.active || c.id === p?.categoryId)
      .map(
        (c) =>
          `<option value="${c.id}" ${c.id === p?.categoryId ? "selected" : ""}>${esc(c.name)}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Marca *<input name="brand" required maxlength="60" value="${esc(p?.brand || "Cosméticos HG")}"></label></div><label>Descripción breve *<input name="shortDescription" required maxlength="130" value="${esc(p?.shortDescription)}"></label><label>Descripción completa o biografía<textarea name="fullDescription" rows="4" maxlength="1200">${esc(p?.fullDescription)}</textarea></label><label>Beneficios principales <small>(uno por línea)</small><textarea name="benefits" rows="3" maxlength="800">${esc((p?.benefits || []).join("\n"))}</textarea></label><label>Recomendación de uso<textarea name="usage" rows="3" maxlength="800">${esc(p?.usage)}</textarea></label><div class="field-pair"><label>Presentación o contenido<input name="presentation" maxlength="160" value="${esc(p?.presentation)}"></label><label>Tonos o variantes <small>(uno por línea)</small><textarea name="variants" rows="3" maxlength="600">${esc((p?.variants || []).join("\n"))}</textarea></label></div><div class="field-pair"><label>Precio<input name="price" type="number" min="0" step="0.01" value="${p?.price ?? ""}"></label><label class="check-label"><input name="priceOnRequest" type="checkbox" ${p?.priceOnRequest !== false ? "checked" : ""}> Mostrar “Consultar”</label></div><div class="field-pair"><label>Disponibilidad<select name="availability"><option value="disponible" ${p?.availability === "disponible" ? "selected" : ""}>Disponible</option><option value="agotado" ${p?.availability === "agotado" ? "selected" : ""}>Agotado</option><option value="proximo" ${p?.availability === "proximo" ? "selected" : ""}>Próximo a llegar</option></select></label><label>Orden *<input name="order" type="number" min="1" required value="${p?.order || data.products.length + 1}"></label></div><div class="check-grid"><label><input name="active" type="checkbox" ${p?.active !== false ? "checked" : ""}> Activo</label><label><input name="featured" type="checkbox" ${p?.featured ? "checked" : ""}> Destacado</label><label><input name="bestSeller" type="checkbox" ${p?.bestSeller ? "checked" : ""}> Más vendido</label><label><input name="isNew" type="checkbox" ${p?.isNew ? "checked" : ""}> Nuevo</label></div><label>Imagen (JPG, PNG o WebP; máximo 5 MB)<input id="product-image" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="image-help">Las imágenes grandes se reducen a un máximo de 900 px antes de guardarse.</p><p class="form-error" role="alert"></p></div><aside class="product-preview"><p>Vista previa</p><div id="preview-image">${imageValue ? `<img src="${esc(imageValue)}" alt="Vista previa">` : "<span>HG</span>"}</div><h3>${esc(p?.name || "Nombre del producto")}</h3><small>${esc(p?.shortDescription || "La descripción breve aparecerá aquí.")}</small></aside></div><div class="dialog-actions"><button type="button" class="admin-secondary cancel-product">Cancelar</button><button type="submit" class="admin-primary">Guardar producto</button></div></form>`;
    dialog.querySelector(".dialog-close").onclick = dialog.querySelector(
      ".cancel-product",
    ).onclick = () => dialog.close();
    dialog.querySelector("#product-image").onchange = handleImage;
    dialog.querySelector("[name=name]").oninput = (e) =>
      (dialog.querySelector(".product-preview h3").textContent =
        e.target.value || "Nombre del producto");
    dialog.querySelector("[name=shortDescription]").oninput = (e) =>
      (dialog.querySelector(".product-preview small").textContent =
        e.target.value || "La descripción breve aparecerá aquí.");
    dialog.querySelector("form").onsubmit = saveProduct;
    dialog.showModal();
  }
  async function handleImage(e) {
    const file = e.target.files[0],
      error = root.querySelector(".form-error");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      error.textContent = "Formato no admitido. Usa JPG, PNG o WebP.";
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error.textContent = "La imagen supera el límite de 5 MB.";
      e.target.value = "";
      return;
    }
    try {
      imageValue = await compressImage(file);
      root.querySelector("#preview-image").innerHTML =
        `<img src="${imageValue}" alt="Vista previa">`;
      error.textContent = "";
    } catch (_) {
      error.textContent = "No se pudo procesar esta imagen.";
    }
  }
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, 900 / Math.max(img.width, img.height)),
            canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas
            .getContext("2d")
            .drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/webp", 0.78));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function saveProduct(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const fd = new FormData(form),
      data = HGStore.load(),
      old = editingId ? data.products.find((p) => p.id === editingId) : null,
      stamp = new Date().toISOString(),
      name = fd.get("name").trim(),
      taken = new Set(
        data.products.filter((p) => p.id !== old?.id).map((p) => p.slug),
      ),
      slug = HGStore.uniqueSlug(name, taken),
      previousSlugs = [
        ...new Set([
          ...(old?.previousSlugs || []),
          ...(old?.slug && old.slug !== slug ? [old.slug] : []),
        ]),
      ];
    if (
      !data.categories.some((c) => c.id === fd.get("categoryId") && c.active)
    ) {
      form.querySelector(".form-error").textContent =
        "La categoría seleccionada ya no está disponible. Actualiza la selección.";
      return;
    }
    const product = {
      id: old?.id || HGStore.uid("prod"),
      name,
      slug,
      previousSlugs,
      categoryId: fd.get("categoryId"),
      brand: fd.get("brand").trim(),
      shortDescription: fd.get("shortDescription").trim(),
      fullDescription: fd.get("fullDescription").trim(),
      benefits: HGStore.stringList(fd.get("benefits")),
      usage: fd.get("usage").trim(),
      presentation: fd.get("presentation").trim(),
      variants: HGStore.stringList(fd.get("variants")),
      price: fd.get("price") === "" ? null : Number(fd.get("price")),
      priceOnRequest: fd.has("priceOnRequest"),
      image: imageValue,
      visual: old?.visual || "wine",
      active: fd.has("active"),
      featured: fd.has("featured"),
      bestSeller: fd.has("bestSeller"),
      isNew: fd.has("isNew"),
      availability: fd.get("availability"),
      order: Number(fd.get("order")),
      createdAt: old?.createdAt || stamp,
      updatedAt: stamp,
    };
    if (old) data.products[data.products.indexOf(old)] = product;
    else data.products.push(product);
    try {
      HGStore.save(data);
      root.querySelector("#product-dialog").close();
      selectAdminSection("productos");
      toast(old ? "Producto actualizado." : "Producto creado.");
    } catch (err) {
      form.querySelector(".form-error").textContent = err.message;
    }
  }
  function renderCategories() {
    const data = HGStore.load(),
      content = root.querySelector("#admin-content");
    content.innerHTML = `<section><div class="admin-heading"><div><p class="admin-kicker">Organización</p><h2>Categorías</h2></div></div><form class="category-add"><label for="new-category">Nueva categoría</label><div><input id="new-category" maxlength="50" required placeholder="Nombre de la categoría"><button class="admin-primary">Crear categoría</button></div><p class="category-error" role="alert"></p></form><div class="category-list">${data.categories
      .sort((a, b) => a.order - b.order)
      .map((c) => {
        const count = data.products.filter((p) => p.categoryId === c.id).length;
        return `<article><span class="state ${c.active ? "active" : "inactive"}">${c.active ? "Activa" : "Inactiva"}</span><div><h3>${esc(c.name)}</h3><p>${count} producto${count === 1 ? "" : "s"}</p></div><div><button data-cat-action="rename" data-id="${c.id}">Renombrar</button><button data-cat-action="toggle" data-id="${c.id}">${c.active ? "Desactivar" : "Activar"}</button><button class="danger" data-cat-action="delete" data-id="${c.id}" ${count ? 'disabled title="Tiene productos asociados"' : ""}>Eliminar</button></div></article>`;
      })
      .join("")}</div></section>`;
    content.querySelector(".category-add").onsubmit = addCategory;
    content.querySelector(".category-list").onclick = categoryAction;
  }
  function addCategory(e) {
    e.preventDefault();
    const input = e.currentTarget.querySelector("input"),
      name = input.value.trim(),
      data = HGStore.load();
    if (data.categories.some((c) => norm(c.name) === norm(name))) {
      e.currentTarget.querySelector(".category-error").textContent =
        "Ya existe una categoría con ese nombre.";
      return;
    }
    const stamp = new Date().toISOString(),
      slug = HGStore.uniqueSlug(
        name,
        new Set(data.categories.map((c) => c.slug)),
      );
    data.categories.push({
      id: HGStore.uid("cat"),
      name,
      slug,
      previousSlugs: [],
      active: true,
      order: data.categories.length + 1,
      description: "",
      design: "neutral",
      image: "",
      color: "",
      createdAt: stamp,
      updatedAt: stamp,
    });
    HGStore.save(data);
    renderCategories();
    toast("Categoría creada.");
  }
  function categoryAction(e) {
    const b = e.target.closest("[data-cat-action]");
    if (!b) return;
    const data = HGStore.load(),
      cat = data.categories.find((c) => c.id === b.dataset.id);
    if (b.dataset.catAction === "rename") {
      const name = prompt("Nuevo nombre de la categoría:", cat.name)?.trim();
      if (!name) return;
      if (
        data.categories.some(
          (c) => c.id !== cat.id && norm(c.name) === norm(name),
        )
      )
        return alert("Ya existe una categoría con ese nombre.");
      const oldSlug = cat.slug;
      cat.name = name;
      cat.slug = HGStore.uniqueSlug(
        name,
        new Set(
          data.categories.filter((c) => c.id !== cat.id).map((c) => c.slug),
        ),
      );
      cat.previousSlugs = [
        ...new Set([
          ...(cat.previousSlugs || []),
          ...(oldSlug && oldSlug !== cat.slug ? [oldSlug] : []),
        ]),
      ];
      cat.updatedAt = new Date().toISOString();
    } else if (b.dataset.catAction === "toggle") {
      cat.active = !cat.active;
      cat.updatedAt = new Date().toISOString();
    } else {
      if (data.products.some((p) => p.categoryId === cat.id))
        return alert("No se puede eliminar porque tiene productos asociados.");
      if (
        !confirm(`¿Eliminar la categoría “${cat.name}”?`) ||
        !confirm(
          "Confirmación final: ¿eliminar definitivamente esta categoría?",
        )
      )
        return;
      data.categories = data.categories.filter((c) => c.id !== cat.id);
    }
    HGStore.save(data);
    renderCategories();
    toast("Categorías actualizadas.");
  }
  function renderBackup() {
    const content = root.querySelector("#admin-content");
    content.innerHTML = `<section><div class="admin-heading"><div><p class="admin-kicker">Seguridad de datos</p><h2>Respaldo y recuperación</h2></div></div><div class="backup-grid"><article><b>↓</b><h3>Exportar respaldo</h3><p>Descarga productos, categorías y configuración actual en un archivo JSON.</p><button class="admin-primary export-data">Exportar JSON</button></article><article><b>↑</b><h3>Importar respaldo</h3><p>El archivo validado reemplazará todos los datos actuales del catálogo.</p><label class="admin-secondary import-label">Seleccionar JSON<input class="import-data" type="file" accept="application/json,.json"></label></article><article class="danger-zone"><b>↺</b><h3>Restaurar datos iniciales</h3><p>Reemplaza cambios, productos e imágenes guardadas. La sesión se conservará.</p><button class="admin-danger reset-data">Restaurar prototipo</button></article></div><p class="backup-status" role="status"></p></section>`;
    content.querySelector(".export-data").onclick = exportData;
    content.querySelector(".import-data").onchange = importData;
    content.querySelector(".reset-data").onclick = resetData;
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(HGStore.load(), null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `cosmeticos-hg-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Respaldo exportado.");
  }
  async function importData(e) {
    const status = root.querySelector(".backup-status");
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024)
        throw new Error("El respaldo supera el límite de 8 MB.");
      const data = JSON.parse(await file.text());
      if (!HGStore.dataIsValid(data))
        throw new Error(
          "El archivo no corresponde a un respaldo válido del esquema actual.",
        );
      if (
        !confirm(
          `Se reemplazarán ${HGStore.load().products.length} productos por ${data.products.length}. ¿Continuar?`,
        )
      )
        return;
      HGStore.save(data);
      status.textContent = "Respaldo importado correctamente.";
    } catch (err) {
      status.textContent = err.message;
    } finally {
      e.target.value = "";
    }
  }
  function resetData() {
    if (
      !confirm(
        "Primera confirmación: se reemplazarán todos los productos, categorías e imágenes guardadas. ¿Continuar?",
      )
    )
      return;
    if (
      !confirm(
        "Confirmación final: esta acción no se puede deshacer sin un respaldo. ¿Restaurar ahora?",
      )
    )
      return;
    HGStore.reset();
    renderBackup();
    toast("Datos iniciales restaurados.");
  }
  function toast(text) {
    const el = root.querySelector(".admin-toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  registerAdminSection("resumen", "Resumen", renderDashboard);
  registerAdminSection("productos", "Productos", renderProducts);
  registerAdminSection("categorias", "Categorías", renderCategories);
  registerAdminSection("respaldo", "Respaldo", renderBackup);
  window.HGAdmin = {
    registerSection: registerAdminSection,
    replaceSection: replaceAdminSection,
    selectSection: selectAdminSection,
    verifyNavigation: verifyAdminNavigation,
    get currentSection() {
      return section;
    },
    sections: ADMIN_SECTIONS,
  };
  let routeScheduled = false;
  function scheduleRoute() {
    if (routeScheduled) return;
    routeScheduled = true;
    queueMicrotask(() => {
      routeScheduled = false;
      route();
    });
  }
  addEventListener("hashchange", scheduleRoute);
  addEventListener("popstate", scheduleRoute);
  addEventListener("hg:datachange", () => {
    if (
      panelRoute() &&
      sessionStorage.getItem(SESSION_KEY) === "active" &&
      section === "resumen"
    )
      renderDashboard();
  });
  addEventListener("storage", (e) => {
    if (
      e.key === HGStore.STORAGE_KEY &&
      panelRoute() &&
      sessionStorage.getItem(SESSION_KEY) === "active"
    )
      renderSection();
  });
  route();
})();
