(() => {
  const STORAGE_KEY = "lsr.whitelist";

  const STATUS = {
    pending: "Demande",
    casier: "Casier / vocal",
    accepted: "Acceptée",
    refused: "Refusée",
  };

  const PLAYER_MSG = {
    pending: "Le staff n’a pas encore ouvert ton casier.",
    casier: "Ton casier est ouvert. Un vocal sera organisé avant toute décision.",
    accepted: "WL acceptée après vocal.",
    refused: "WL refusée après vocal.",
  };

  let staff = false;
  let items = [];
  let filter = "pending";

  function savedKeys() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function remember(item) {
    if (!item?.id || !item.key) return;
    const list = savedKeys().filter((entry) => entry.id !== item.id);
    list.unshift({ id: item.id, key: item.key });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 10)));
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("fr-FR");
  }

  function renderMine() {
    const mine = items.filter((item) => !staff || savedKeys().some((entry) => entry.id === item.id));
    const latest = mine[0];
    if (!latest) {
      $("#wlMine").innerHTML = `
        <h2>Ton suivi</h2>
        <p class="muted">Aucune demande enregistrée sur cet appareil. Envoie le dossier à gauche.</p>`;
      return;
    }
    $("#wlMine").innerHTML = `
      <h2>Ta demande #${latest.number}</h2>
      <p class="wl-status wl-status-${escapeHtml(latest.status)}">${escapeHtml(STATUS[latest.status] || latest.status)}</p>
      <p><strong>${escapeHtml(latest.name)}</strong> · ${escapeHtml(latest.discord)}</p>
      <p class="muted">Envoyée le ${escapeHtml(formatDate(latest.createdAt))}</p>
      ${
        latest.staffNote
          ? `<p class="wl-note">${escapeHtml(latest.staffNote)}</p>`
          : `<p class="muted">${escapeHtml(PLAYER_MSG[latest.status] || "")}</p>`
      }`;
  }

  function renderStaffList() {
    if (!staff) {
      $("#wlStaff").hidden = true;
      return;
    }
    $("#wlStaff").hidden = false;
    const list = items.filter((item) => filter === "all" || item.status === filter);
    $("#wlList").innerHTML = list.length
      ? list
          .map(
            (item) => `<button class="wl-item" type="button" data-id="${escapeHtml(item.id)}">
              <strong>#${item.number} · ${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(STATUS[item.status] || item.status)} · ${escapeHtml(item.discord)}</span>
              <em>${item.casierId ? "Ouvrir le casier" : "Créer le casier"}</em>
            </button>`
          )
          .join("")
      : `<p class="muted">Aucune demande dans ce filtre.</p>`;
  }

  function render() {
    renderMine();
    renderStaffList();
  }

  async function load() {
    const data = await api("/api/whitelist");
    staff = Boolean(data.staff);
    items = data.items || [];
    const pendingCount = items.filter((item) => item.status === "pending").length;
    const casierCount = items.filter((item) => item.status === "casier").length;
    $("#wlMeta").textContent = staff
      ? `${pendingCount} demande(s) sans casier · ${casierCount} en attente de vocal. Les casiers restent après la décision.`
      : "Remplis le dossier. Le staff ouvre un casier, te convoque en vocal, puis décide.";
    render();
  }

  async function openFromWhitelist(item) {
    if (item.casierId) {
      await window.CasierWindow.open(item.casierId);
      return;
    }
    const data = await api(`/api/whitelist/${item.id}/casier`, {
      method: "POST",
      body: JSON.stringify({ casierNote: "" }),
    });
    await load();
    if (data.casier?.id) await window.CasierWindow.open(data.casier.id);
  }

  $("#wlForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = $("#wlError");
    error.textContent = "";
    const form = new FormData(event.target);
    try {
      const data = await api("/api/whitelist", {
        method: "POST",
        body: JSON.stringify({
          discord: form.get("discord"),
          age: form.get("age"),
          name: form.get("name"),
          story: form.get("story"),
          experience: form.get("experience"),
          motivation: form.get("motivation"),
          mic: form.get("mic"),
          rules: form.get("rules") === "on",
        }),
      });
      remember(data.item);
      event.target.reset();
      await load();
      error.textContent = "Dossier envoyé. Le staff ouvrira un casier avant le vocal.";
    } catch (err) {
      error.textContent = err.message;
    }
  });

  $("#wlStaff").addEventListener("click", async (event) => {
    const filterBtn = event.target.closest("[data-filter]");
    if (filterBtn) {
      filter = filterBtn.dataset.filter;
      render();
      return;
    }
    const itemBtn = event.target.closest("[data-id]");
    if (!itemBtn) return;
    const item = items.find((entry) => entry.id === itemBtn.dataset.id);
    if (!item) return;
    const staffError = $("#wlStaffError");
    if (staffError) staffError.textContent = "";
    try {
      await openFromWhitelist(item);
    } catch (err) {
      if (staffError) staffError.textContent = err.message;
    }
  });

  window.addEventListener("casier:changed", () => {
    load().catch(() => {});
  });

  async function init() {
    await window.Staff.load();
    window.Staff.renderAuth($("#authArea"));
    await load();
  }

  init().catch(() => {
    $("#wlMeta").textContent = "Impossible de charger les demandes. Relance le site avec npm start.";
  });
})();
