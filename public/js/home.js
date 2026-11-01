(() => {
  let home = { levels: [], team: [] };
  let discordRoles = [];

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
    const roles = discordRoles.length
      ? `<select class="f-role-id"><option value="">Pas lié à Discord (membres ajoutés à la main)</option>${discordRoles
          .map((r) => `<option value="${r.id}"${r.id === level.roleId ? " selected" : ""}>Rôle Discord : ${escapeHtml(r.name)}</option>`)
          .join("")}</select>`
      : "";
    const c = row("lv-card", `
      <div class="editor-card-top">
        <input class="f-level" value="${escapeHtml(level.name)}" placeholder="Nom du niveau (ex. Direction)" maxlength="40">
        <button class="btn btn-ghost btn-compact up" type="button">↑</button>
        <button class="btn btn-ghost btn-compact remove" type="button">Supprimer</button>
      </div>${roles}`);
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

  async function openEditor() {
    discordRoles = (await api("/api/discord/roles").catch(() => ({ roles: [] }))).roles;
    const box = $("#teamFields");
    box.innerHTML = `
      <p class="kicker">Niveaux de l’organigramme (du haut vers le bas)</p><div id="lvList"></div>
      <button class="btn btn-ghost btn-compact" id="addLevel" type="button">Ajouter un niveau</button>
      <p class="kicker">Membres</p><div id="mbList"></div>`;
    home.levels.forEach((l) => $("#lvList").append(levelCard(l)));
    home.team.forEach((m) => $("#mbList").append(memberCard(m)));
    $("#addLevel").onclick = () => ($("#lvList").append(levelCard({ id: crypto.randomUUID(), name: "", roleId: "" })), refreshSelects());
    $("#syncTeam").hidden = !discordRoles.length;
    $("#teamEditor").hidden = false;
  }

  $("#editTeam").onclick = () => (window.Staff.can("team") ? openEditor() : window.Staff.openLogin());
  $("#cancelTeam").onclick = () => ($("#teamEditor").hidden = true);
  $("#addMember").onclick = () => $("#mbList").append(memberCard({ id: crypto.randomUUID(), name: "", role: "", level: "", bio: "" }));

  async function save() {
    const levels = levelInputs().map((c) => ({ id: c.dataset.id, name: c.querySelector(".f-level").value, roleId: c.querySelector(".f-role-id")?.value || "" }));
    const team = [...$("#mbList").children].map((c) => ({
      id: c.dataset.id,
      name: c.querySelector(".f-name").value,
      role: c.querySelector(".f-role").value,
      level: c.querySelector(".f-member-level").value,
      bio: c.querySelector(".f-bio").value,
    }));
    home = await api("/api/home", { method: "POST", body: JSON.stringify({ levels, team }) });
  }

  $("#teamEditor").onsubmit = async (event) => {
    event.preventDefault();
    await save();
    $("#teamEditor").hidden = true;
    renderTeam();
  };

  // Enregistre, puis remplit les niveaux liés avec les membres qui ont le rôle sur Discord
  $("#syncTeam").onclick = async () => {
    try {
      await save();
      home = await api("/api/home/sync", { method: "POST", body: "{}" });
      renderTeam();
      openEditor();
    } catch (err) {
      alert(err.message);
    }
  };

  (async () => {
    try {
      await window.Staff.load();
      window.Staff.renderAuth($("#authArea"));
      $("#editTeam").hidden = !window.Staff.can("team");
      $("#editAgenda").hidden = !window.Staff.can("panel");
      home = await api("/api/home");
      renderTeam();
    } catch {
      $("#teamGrid").innerHTML = `<p class="empty">Impossible de charger l’accueil. Lance le site avec npm start.</p>`;
    }
  })();
})();

// ----- Calendrier de la semaine : événements entreprises -----
(() => {
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = new Date();
  const thisMonday = addDays(today, -((today.getDay() + 6) % 7));
  let monday = thisMonday;
  let events = [];

  const short = (d, year) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}) });

  function item(e) {
    return `<article class="agenda-item">
        ${e.time ? `<time>${escapeHtml(e.time)}</time>` : ""}
        <strong>${escapeHtml(e.title)}</strong>
        ${e.company || e.place ? `<span>${escapeHtml([e.company, e.place].filter(Boolean).join(" · "))}</span>` : ""}
        ${e.description ? `<p class="muted">${escapeHtml(e.description)}</p>` : ""}
      </article>`;
  }

  function render() {
    const sunday = addDays(monday, 6);
    $("#agendaLabel").textContent = `Semaine du ${short(monday, monday.getFullYear() !== sunday.getFullYear())} au ${short(sunday, true)}`;
    $("#agendaToday").hidden = iso(monday) === iso(thisMonday);
    $("#agendaWeek").innerHTML = DAYS.map((name, i) => {
      const day = addDays(monday, i);
      const list = events.filter((e) => e.date === iso(day));
      return `<section class="agenda-day${iso(day) === iso(today) ? " today" : ""}${list.length ? " has" : ""}">
          <header><span>${name}</span><b>${day.getDate()}</b></header>
          ${list.map(item).join("") || `<p class="agenda-empty">—</p>`}
        </section>`;
    }).join("");
  }

  const move = (days) => ((monday = addDays(monday, days)), render());
  $("#agendaPrev").onclick = () => move(-7);
  $("#agendaNext").onclick = () => move(7);
  $("#agendaToday").onclick = () => ((monday = thisMonday), render());

  render();
  api("/api/events")
    .then((data) => {
      events = data.items || [];
      render();
    })
    .catch(() => {});
})();
