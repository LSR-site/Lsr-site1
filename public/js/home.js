(() => {
  let home = { levels: [], team: [] };

  function card(member, top) {
    return `
      <article class="org-node">
        <div class="org-card">
          <span class="org-initials">${initials(member.name)}</span>
          <h3>${escapeHtml(member.name)}</h3>
          ${member.role ? `<span class="grade-badge${top ? " grade-fondateur" : ""}">${escapeHtml(member.role)}</span>` : ""}
          ${member.bio ? `<p class="muted">${escapeHtml(member.bio)}</p>` : ""}
        </div>
      </article>`;
  }

  // Organigramme : un rang par niveau, dans l'ordre choisi par le fondateur
  function renderTeam() {
    const levels = home.levels.length ? home.levels : [{ id: "", name: "" }];
    const html = levels
      .map((level, i) => ({ level, i, people: home.team.filter((m) => (home.levels.length ? m.level === level.id : true)) }))
      .filter(({ people }) => people.length)
      .map(
        ({ level, i, people }) => `
        <section class="org-level">
          ${level.name ? `<p class="kicker org-label">${escapeHtml(level.name)}</p>` : ""}
          <div class="org-row">${people.map((m) => card(m, i === 0)).join("")}</div>
        </section>`
      )
      .join("");
    $("#teamGrid").innerHTML = html || `<p class="empty">Aucun membre staff pour le moment.</p>`;
  }

  // ----- Éditeur : niveaux puis membres -----
  const row = (cls, html) => Object.assign(document.createElement("article"), { className: `editor-card ${cls}`, innerHTML: html });
  const levelInputs = () => [...$("#teamFields").querySelectorAll(".lv-card")];

  function levelOptions(selected) {
    return levelInputs()
      .map((c) => `<option value="${c.dataset.id}"${c.dataset.id === selected ? " selected" : ""}>${escapeHtml(c.querySelector(".f-level").value || "Niveau")}</option>`)
      .join("");
  }

  function refreshSelects() {
    $("#teamFields").querySelectorAll(".f-member-level").forEach((s) => (s.innerHTML = levelOptions(s.value)));
  }

  function levelCard(level) {
    const c = row("lv-card", `
      <div class="editor-card-top">
        <input class="f-level" value="${escapeHtml(level.name)}" placeholder="Nom du niveau (ex. Direction)" maxlength="40">
        <button class="btn btn-ghost btn-compact up" type="button">↑</button>
        <button class="btn btn-ghost btn-compact remove" type="button">Supprimer</button>
      </div>`);
    c.dataset.id = level.id;
    c.querySelector(".f-level").oninput = refreshSelects;
    c.querySelector(".up").onclick = () => {
      if (c.previousElementSibling) c.after(c.previousElementSibling);
      refreshSelects();
    };
    c.querySelector(".remove").onclick = () => (c.remove(), refreshSelects());
    return c;
  }

  function memberCard(m) {
    const c = row("mb-card", `
      <div class="editor-card-top">
        <input class="f-name" value="${escapeHtml(m.name)}" placeholder="Nom" maxlength="40">
        <input class="f-role" value="${escapeHtml(m.role)}" placeholder="Rôle (tu l'écris toi-même)" maxlength="40">
        <button class="btn btn-ghost btn-compact remove" type="button">Supprimer</button>
      </div>
      <select class="f-member-level">${levelOptions(m.level)}</select>
      <textarea class="f-bio" rows="2" placeholder="Bio">${escapeHtml(m.bio)}</textarea>`);
    c.dataset.id = m.id;
    c.querySelector(".remove").onclick = () => c.remove();
    return c;
  }

  function openEditor() {
    const box = $("#teamFields");
    box.innerHTML = `
      <p class="kicker">Niveaux de l’organigramme (du haut vers le bas)</p><div id="lvList"></div>
      <button class="btn btn-ghost btn-compact" id="addLevel" type="button">Ajouter un niveau</button>
      <p class="kicker">Membres</p><div id="mbList"></div>`;
    home.levels.forEach((l) => $("#lvList").append(levelCard(l)));
    home.team.forEach((m) => $("#mbList").append(memberCard(m)));
    $("#addLevel").onclick = () => ($("#lvList").append(levelCard({ id: crypto.randomUUID(), name: "" })), refreshSelects());
    $("#teamEditor").hidden = false;
  }

  $("#editTeam").onclick = () => (window.Staff.can("team") ? openEditor() : window.Staff.openLogin());
  $("#cancelTeam").onclick = () => ($("#teamEditor").hidden = true);
  $("#addMember").onclick = () => $("#mbList").append(memberCard({ id: crypto.randomUUID(), name: "", role: "", level: "", bio: "" }));

  $("#teamEditor").onsubmit = async (event) => {
    event.preventDefault();
    const levels = levelInputs().map((c) => ({ id: c.dataset.id, name: c.querySelector(".f-level").value }));
    const team = [...$("#mbList").children].map((c) => ({
      id: c.dataset.id,
      name: c.querySelector(".f-name").value,
      role: c.querySelector(".f-role").value,
      level: c.querySelector(".f-member-level").value,
      bio: c.querySelector(".f-bio").value,
    }));
    home = await api("/api/home", { method: "POST", body: JSON.stringify({ levels, team }) });
    $("#teamEditor").hidden = true;
    renderTeam();
  };

  (async () => {
    try {
      await window.Staff.load();
      window.Staff.renderAuth($("#authArea"));
      $("#editTeam").hidden = !window.Staff.can("team");
      home = await api("/api/home");
      renderTeam();
    } catch {
      $("#teamGrid").innerHTML = `<p class="empty">Impossible de charger l’accueil. Lance le site avec npm start.</p>`;
    }
  })();
})();
