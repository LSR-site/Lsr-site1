(() => {

  const WL_STATUS = {
    pending: "Demande",
    casier: "Vocal",
    accepted: "WL ok",
    refused: "Refusée",
  };

  let items = [];
  let query = "";

  function render() {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (!q) return true;
      return `${item.name} ${item.discord} ${item.number}`.toLowerCase().includes(q);
    });
    $("#casierList").innerHTML = list.length
      ? list
          .map((item) => {
            const status = item.whitelist?.status || "";
            return `
        <article class="casier-tile">
          <button class="casier-tile-open" type="button" data-open="${escapeHtml(item.id)}">
            <span class="casier-tile-num">#${item.number}</span>
            <span class="casier-tile-avatar">${initials(item.name)}</span>
            <strong>${escapeHtml(item.name)}</strong>
            <span class="muted">${escapeHtml(item.discord)}</span>
            <span class="casier-tile-pills">
              ${item.concernCount ? `<span class="casier-pill casier-pill-warn">${item.concernCount} point(s)</span>` : ""}
              ${item.sanctionCount ? `<span class="casier-pill casier-pill-bad">${item.sanctionCount} sanction(s)</span>` : ""}
              ${!item.concernCount && !item.sanctionCount ? `<span class="casier-pill">Propre</span>` : ""}
            </span>
            ${status ? `<span class="wl-status wl-status-${escapeHtml(status)}">${escapeHtml(WL_STATUS[status] || status)}</span>` : ""}
            <span class="casier-tile-excerpt">${
              item.lastNote ? escapeHtml(item.lastNote.text) : "Aucune note pour l’instant."
            }</span>
          </button>
          <button class="casier-tile-del" type="button" data-delete="${escapeHtml(item.id)}" aria-label="Supprimer le casier">Supprimer</button>
        </article>`;
          })
          .join("")
      : `<p class="muted casier-empty">Aucun casier dans ce tableau.</p>`;
  }

  async function load() {
    const data = await api("/api/casiers");
    items = data.items || [];
    $("#casierMeta").textContent = `${items.length} case(s) dans le tableau. Clique pour ouvrir, ou supprime une case.`;
    render();
  }

  $("#casierSearch")?.addEventListener("input", (event) => {
    query = event.target.value;
    render();
  });

  $("#casierList")?.addEventListener("click", async (event) => {
    const del = event.target.closest("[data-delete]");
    if (del) {
      event.preventDefault();
      const item = items.find((entry) => entry.id === del.dataset.delete);
      try {
        await window.CasierWindow.remove(item || { id: del.dataset.delete });
      } catch (err) {
        alert(err.message);
      }
      return;
    }
    const open = event.target.closest("[data-open]");
    if (!open) return;
    await window.CasierWindow.open(open.dataset.open);
  });

  window.addEventListener("casier:changed", () => {
    load().catch(() => {});
  });

  async function init() {
    await window.Staff.load();
    window.Staff.renderAuth($("#authArea"));
    if (!window.Staff.can("tickets") && !window.Staff.isStaff()) {
      $("#casierGate").hidden = false;
      $("#casierDesk").hidden = true;
      $("#casierMeta").textContent = "Réservé au staff. Connecte-toi pour ouvrir les casiers.";
      return;
    }
    $("#casierGate").hidden = true;
    $("#casierDesk").hidden = false;
    await load();
  }

  init().catch(() => {
    $("#casierMeta").textContent = "Impossible de charger les casiers. Relance le site avec npm start.";
  });
})();
