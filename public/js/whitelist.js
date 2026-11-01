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
  let plan = { items: [], pool: [] };

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
      }
      ${mySlot() ? `<p class="wl-slot">🎙️ Ton passage WL : <b>${escapeHtml(slotWhen(mySlot()))}</b>${mySlot().staff ? ` avec ${escapeHtml(mySlot().staff)}` : ""}</p>` : ""}`;
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

  // ----- Planning des passages WL -----
  const mySlot = () => (staff ? null : plan.items.find((s) => s.mine && s.date >= new Date().toISOString().slice(0, 10)));
  const slotWhen = (s) =>
    `${new Date(`${s.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${s.start}${s.end ? `–${s.end}` : ""}`;

  function slotCard(s) {
    const full = s.taken >= s.places;
    return `<${staff ? `button type="button" data-slot="${escapeHtml(s.id)}"` : "article"} class="agenda-item plan-slot${s.mine ? " mine" : ""}${full ? " full" : ""}">
        <time>${escapeHtml(s.start)}${s.end ? ` – ${escapeHtml(s.end)}` : ""}</time>
        ${s.mine ? `<strong>Ton passage</strong>` : ""}
        ${s.staff ? `<span>Avec ${escapeHtml(s.staff)}</span>` : ""}
        <span class="plan-places">${full ? "Complet" : `${s.places - s.taken} place(s) libre(s)`} · ${s.taken}/${s.places}</span>
        ${staff && s.candidates.length ? `<span class="plan-names">${s.candidates.map((c) => escapeHtml(c.name)).join(", ")}</span>` : ""}
        ${s.note ? `<p class="muted">${escapeHtml(s.note)}</p>` : ""}
      </${staff ? "button" : "article"}>`;
  }
  const planCal = weekCalendar($("#planBox"), (date) => plan.items.filter((s) => s.date === date).map(slotCard).join(""));

  async function loadPlan() {
    const first = !plan.loaded;
    plan = { ...(await api("/api/wl-planning")), loaded: true };
    $("#planAdd").hidden = !plan.staff;
    // Le joueur arrive directement sur la semaine de son passage
    first && mySlot() ? planCal.goTo(mySlot().date) : planCal.render();
    renderMine();
  }

  function openSlot(slot) {
    let modal = $("#slotModal");
    if (!modal) {
      modal = Object.assign(document.createElement("div"), { className: "modal", id: "slotModal" });
      document.body.append(modal);
    }
    const s = slot || { id: "", date: new Date().toISOString().slice(0, 10), start: "20:00", end: "22:00", staff: window.Staff.me?.username || "", places: 4, note: "", candidates: [] };
    const chosen = new Set((s.candidates || []).map((c) => c.id));
    const pool = [...(s.candidates || []), ...plan.pool.filter((c) => !chosen.has(c.id))];
    const STATUS_SHORT = { pending: "demande", casier: "attente vocal", accepted: "acceptée", refused: "refusée" };
    modal.innerHTML = `
      <form class="modal-card" id="slotForm">
        <h2>${slot ? "Créneau de passage WL" : "Nouveau créneau"}</h2>
        <div class="wl-grid">
          <label>Date <input name="date" type="date" required value="${escapeHtml(s.date)}"></label>
          <label>Places <input name="places" type="number" min="1" max="30" value="${s.places}"></label>
          <label>Début <input name="start" type="time" required value="${escapeHtml(s.start)}"></label>
          <label>Fin <input name="end" type="time" value="${escapeHtml(s.end)}"></label>
        </div>
        <label>Staff du vocal <input name="staff" maxlength="60" value="${escapeHtml(s.staff)}" placeholder="Ex. Recruteur Max"></label>
        <label>Note (visible par tous) <input name="note" maxlength="200" value="${escapeHtml(s.note)}" placeholder="Ex. Salon vocal « Passage WL 1 »"></label>
        <p class="kicker">Candidats sur ce créneau</p>
        <div class="slot-pool">${
          pool.length
            ? pool.map((c) => `<label class="check-line slot-cand"><input type="checkbox" value="${escapeHtml(c.id)}"${chosen.has(c.id) ? " checked" : ""}> #${c.number} · ${escapeHtml(c.name)} <em>${escapeHtml(c.discord)} · ${STATUS_SHORT[c.status] || c.status}</em></label>`).join("")
            : `<p class="muted">Aucune demande en attente pour l’instant.</p>`
        }</div>
        <div class="modal-actions">
          <button class="btn btn-gold" type="submit">Enregistrer</button>
          ${slot ? `<button class="btn btn-ghost" type="button" id="slotDelete">Supprimer le créneau</button>` : ""}
          <button class="btn btn-ghost" type="button" id="slotClose">Fermer</button>
        </div>
        <p class="muted" id="slotError"></p>
      </form>`;
    modal.classList.add("open");
    $("#slotClose").onclick = () => modal.classList.remove("open");
    if (slot) $("#slotDelete").onclick = async () => {
      if (!confirm("Supprimer ce créneau ?")) return;
      await api("/api/wl-planning/delete", { method: "POST", body: JSON.stringify({ id: slot.id }) });
      modal.classList.remove("open");
      loadPlan();
    };
    $("#slotForm").onsubmit = async (event) => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(event.target));
      const candidates = [...modal.querySelectorAll(".slot-cand input:checked")].map((i) => i.value);
      try {
        const saved = await api("/api/wl-planning", { method: "POST", body: JSON.stringify({ ...form, id: s.id, candidates }) });
        modal.classList.remove("open");
        await loadPlan();
        planCal.goTo(saved.slot.date);
      } catch (err) {
        $("#slotError").textContent = err.message;
      }
    };
  }

  $("#planAdd").onclick = () => openSlot(null);
  $("#planBox").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-slot]");
    if (btn) openSlot(plan.items.find((s) => s.id === btn.dataset.slot));
  });

  async function load() {
    const data = await api("/api/whitelist");
    staff = Boolean(data.staff);
    botWarning(data.botWarning);
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
    load().then(loadPlan).catch(() => {});
  });

  async function init() {
    await window.Staff.load();
    window.Staff.renderAuth($("#authArea"));
    await load();
    await loadPlan();
  }

  init().catch(() => {
    $("#wlMeta").textContent = "Impossible de charger les demandes. Relance le site avec npm start.";
  });
})();
