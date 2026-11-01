(() => {

  const WL_STATUS = {
    pending: "Demande",
    casier: "Vocal",
    accepted: "WL ok",
    refused: "Refusée",
  };

  let items = [];
  let query = "";
  let kind = "all";

  // Filtres : type de casier, statut WL, tri
  const KINDS = {
    all: ["Tous", () => true],
    sanction: ["Avec sanctions", (i) => i.sanctionCount > 0],
    concern: ["Points dérangeants", (i) => i.concernCount > 0],
    clean: ["Propres", (i) => !i.sanctionCount && !i.concernCount],
  };
  const SORTS = {
    recent: (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    number: (a, b) => b.number - a.number,
    sanctions: (a, b) => b.sanctionCount - a.sanctionCount || b.concernCount - a.concernCount,
  };

  function renderChips() {
    $("#casierKinds").innerHTML = Object.entries(KINDS)
      .map(([id, [label, test]]) => `<button class="filter-chip${id === kind ? " active" : ""}" type="button" data-kind="${id}">${label} <b>${items.filter(test).length}</b></button>`)
      .join("");
  }

  function render() {
    renderChips();
    const q = query.trim().toLowerCase();
    const status = $("#casierStatus").value;
    const list = items
      .filter(KINDS[kind][1])
      .filter((item) => !status || (status === "none" ? !item.whitelist : item.whitelist?.status === status))
      .filter((item) => !q || `${item.name} ${item.discord} ${item.number} ${(item.notes || []).map((n) => n.text).join(" ")}`.toLowerCase().includes(q))
      .sort(SORTS[$("#casierSort").value] || SORTS.recent);
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
      : `<p class="muted casier-empty">${items.length ? "Aucun casier ne correspond à ces filtres." : "Aucun casier dans ce tableau."}</p>`;
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
  $("#casierStatus").onchange = render;
  $("#casierSort").onchange = render;
  $("#casierKinds").onclick = (event) => {
    const chip = event.target.closest("[data-kind]");
    if (!chip) return;
    kind = chip.dataset.kind;
    render();
  };

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
    if (!window.Staff.can("casiers")) {
      $("#casierGate").hidden = false;
      $("#casierDesk").hidden = true;
      $("#casierMeta").textContent = window.Staff.isStaff() ? "Ton grade n’a pas accès aux casiers." : "Réservé au staff. Connecte-toi pour ouvrir les casiers.";
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
