(() => {
  let home = { levels: [], team: [] };
  let events = [];

  // ----- Organigramme (rendu partagé avec le panel) -----
  const renderTeam = () => ($("#teamGrid").innerHTML = orgChart(home) || `<p class="empty">Aucun membre staff pour le moment.</p>`);

  // ----- Calendrier des événements entreprises -----
  function item(e) {
    return `<article class="agenda-item">
        ${e.time ? `<time>${escapeHtml(e.time)}</time>` : ""}
        <strong>${escapeHtml(e.title)}</strong>
        ${e.company || e.place ? `<span>${escapeHtml([e.company, e.place].filter(Boolean).join(" · "))}</span>` : ""}
        ${e.description ? `<p class="muted">${escapeHtml(e.description)}</p>` : ""}
      </article>`;
  }
  const calendar = weekCalendar($("#agendaBox"), (date) => events.filter((e) => e.date === date).map(item).join(""));

  // ----- Gestion des événements (tout le staff sauf recruteur) -----
  function eventRow(e) {
    return `<article class="event-edit" data-id="${escapeHtml(e.id)}">
        <div class="event-edit-top">
          <input class="f-date" type="date" value="${escapeHtml(e.date)}" required>
          <input class="f-time" type="time" value="${escapeHtml(e.time)}">
          <input class="f-company" value="${escapeHtml(e.company)}" maxlength="60" placeholder="Entreprise">
          <button class="btn btn-ghost btn-compact remove" type="button">Supprimer</button>
        </div>
        <input class="f-title" value="${escapeHtml(e.title)}" maxlength="80" placeholder="Titre de l’événement">
        <div class="event-edit-top">
          <input class="f-place" value="${escapeHtml(e.place)}" maxlength="80" placeholder="Lieu (facultatif)">
          <input class="f-desc" value="${escapeHtml(e.description)}" maxlength="400" placeholder="Description (facultatif)">
        </div>
      </article>`;
  }

  function openEvents() {
    let modal = $("#eventsModal");
    if (!modal) {
      modal = Object.assign(document.createElement("div"), { className: "modal", id: "eventsModal" });
      modal.innerHTML = `
        <form class="modal-card modal-wide" id="eventsForm">
          <h2>Événements entreprises</h2>
          <p class="muted">Ils s’affichent dans le calendrier de l’accueil, semaine par semaine.</p>
          <button class="btn btn-ghost btn-compact" type="button" id="eventAdd">+ Ajouter un événement</button>
          <div id="eventRows" class="event-rows"></div>
          <div class="modal-actions">
            <button class="btn btn-gold" type="submit">Enregistrer</button>
            <button class="btn btn-ghost" type="button" id="eventsClose">Fermer</button>
          </div>
          <p class="muted" id="eventsError"></p>
        </form>`;
      document.body.append(modal);
      $("#eventsClose").onclick = () => modal.classList.remove("open");
      $("#eventRows").onclick = (event) => event.target.closest(".remove")?.closest(".event-edit").remove();
      $("#eventAdd").onclick = () => {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        $("#eventRows").insertAdjacentHTML("afterbegin", eventRow({ id: crypto.randomUUID(), date, time: "", title: "", company: "", place: "", description: "" }));
        $("#eventRows .f-title").focus();
      };
      $("#eventsForm").onsubmit = async (event) => {
        event.preventDefault();
        const items = [...document.querySelectorAll("#eventRows .event-edit")].map((row) => ({
          id: row.dataset.id,
          ...Object.fromEntries(["date", "time", "title", "company", "place"].map((k) => [k, row.querySelector(`.f-${k}`).value])),
          description: row.querySelector(".f-desc").value,
        }));
        try {
          events = (await api("/api/events", { method: "POST", body: JSON.stringify({ items }) })).items;
          calendar.render();
          modal.classList.remove("open");
        } catch (err) {
          $("#eventsError").textContent = err.message;
        }
      };
    }
    $("#eventsError").textContent = "";
    $("#eventRows").innerHTML = [...events].reverse().map(eventRow).join("");
    modal.classList.add("open");
  }
  $("#editAgenda").onclick = openEvents;

  (async () => {
    try {
      await window.Staff.load();
      window.Staff.renderAuth($("#authArea"));
      $("#editTeam").hidden = !window.Staff.can("team");
      $("#editAgenda").hidden = !window.Staff.can("events");
      [home, { items: events }] = await Promise.all([api("/api/home"), api("/api/events")]);
      renderTeam();
      calendar.render();
    } catch {
      $("#teamGrid").innerHTML = `<p class="empty">Impossible de charger l’accueil. Lance le site avec npm start.</p>`;
    }
  })();
})();
