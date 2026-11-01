(() => {
  const main = $("#adminMain");
  let data = null;
  let section = location.hash.slice(1) || "dashboard";

  const toast = (message, bad = false) => {
    const box = $("#adminToast");
    box.textContent = message;
    box.className = `admin-toast${bad ? " bad" : ""}`;
    box.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (box.hidden = true), 3500);
  };

  const head = (title, sub, action = "") => `
    <header class="admin-head">
      <div>
        <p class="admin-eyebrow">Los Santos Reborn</p>
        <h1>${title}</h1>
        <p class="muted">${sub}</p>
      </div>
      ${action}
    </header>`;

  const save = async (payload, message = "Enregistré ✔") => {
    try {
      data.site = await api("/api/site", { method: "POST", body: JSON.stringify(payload) });
      toast(message);
      return true;
    } catch (err) {
      toast(err.message, true);
      return false;
    }
  };

  // ---------- Sections ----------
  const SECTIONS = {
    dashboard() {
      const s = data.stats;
      const stat = (n, label) => `<article class="admin-stat"><strong>${n}</strong><span>${label}</span></article>`;
      return `${head("Tableau de bord", "Vue d’ensemble du site et du bot Discord.")}
        ${data.botWarning ? `<p class="admin-alert">⚠️ ${escapeHtml(data.botWarning)}</p>` : `<p class="admin-ok">✅ Le bot Discord est relié au site.</p>`}
        <div class="admin-stats">
          ${stat(s.tickets, "Tickets ouverts")}
          ${stat(s.ticketsDiscord, "dont ouverts sur Discord")}
          ${stat(s.wlPending, "WL à traiter")}
          ${stat(s.wlVocal, "WL en attente de vocal")}
          ${stat(s.wlAccepted, "WL acceptées")}
          ${stat(s.casiers, "Casiers")}
          ${stat(s.team, "Membres dans l’équipe")}
        </div>
        <div class="admin-quick">
          <a class="btn btn-ghost" href="/tickets">Répondre aux tickets</a>
          <a class="btn btn-ghost" href="/whitelist">Demandes WL</a>
          <a class="btn btn-ghost" href="/casiers">Casiers</a>
          <a class="btn btn-ghost" href="/reglement">Articles du règlement</a>
        </div>`;
    },

    tickets() {
      const rows = data.tickets
        .map(
          (t) => `<article class="admin-row">
            <div>
              <strong>#${t.number} · ${escapeHtml(t.subject)}</strong>
              <span>${escapeHtml(t.authorName)} · ${escapeHtml(t.categoryLabel)} · ${t.messages} message(s)</span>
            </div>
            <div class="admin-row-actions">
              <span class="admin-pill ${t.origin === "Discord" ? "blue" : ""}">${t.origin}</span>
              ${t.linked ? "" : `<span class="admin-pill warn">Salon Discord en attente</span>`}
              <a class="admin-btn" href="/tickets?id=${t.id}">Ouvrir</a>
            </div>
          </article>`
        )
        .join("");
      return `${head("Suivi des tickets", "Tous les tickets ouverts, sur le site comme sur Discord.", `<a class="admin-add" href="/tickets">Aller aux tickets</a>`)}
        <div class="admin-list">${rows || `<p class="muted">Aucun ticket ouvert.</p>`}</div>`;
    },

    tabs() {
      const rows = data.tabs
        .map(
          (t) => `<article class="admin-row" data-route="${t.route}">
            <div>
              <input class="admin-input f-label" value="${escapeHtml(t.label)}" maxlength="30" placeholder="${escapeHtml(t.original)}">
              <span>${t.route}${t.route === "/casiers" ? " · visible seulement par le staff" : ""}</span>
            </div>
            <div class="admin-row-actions">
              ${t.route === "/" ? `<span class="admin-pill green">Toujours visible</span>` : `<button class="admin-pill toggle ${t.visible ? "green" : "off"}" type="button" data-visible="${t.visible}">${t.visible ? "Visible" : "Masqué"}</button>`}
            </div>
          </article>`
        )
        .join("");
      return `${head("Onglets", "Renomme ou masque les onglets du menu du site.", `<button class="admin-add" type="button" id="saveTabs">Enregistrer</button>`)}
        <div class="admin-list">${rows}</div>`;
    },

    home() {
      const photo = data.site.homePhoto || "";
      const eventRow = (e) => `<article class="admin-event" data-id="${escapeHtml(e.id)}">
          <div class="admin-inline">
            <input class="admin-input f-date" type="date" value="${escapeHtml(e.date)}" required>
            <input class="admin-input f-time" type="time" value="${escapeHtml(e.time)}">
            <input class="admin-input f-company" value="${escapeHtml(e.company)}" maxlength="60" placeholder="Entreprise (ex. Bahama Mamas)">
          </div>
          <input class="admin-input f-title" value="${escapeHtml(e.title)}" maxlength="80" placeholder="Titre de l’événement">
          <div class="admin-inline">
            <input class="admin-input f-place" value="${escapeHtml(e.place)}" maxlength="80" placeholder="Lieu (facultatif)">
            <input class="admin-input f-desc" value="${escapeHtml(e.description)}" maxlength="400" placeholder="Petite description (facultatif)">
          </div>
          <button class="admin-btn danger remove-event" type="button">Supprimer</button>
        </article>`;
      SECTIONS.home.eventRow = eventRow;
      return `${head("Accueil", "La photo en haut de l’accueil et le calendrier des événements entreprises.")}
        <h2 class="admin-subtitle">Photo de l’accueil</h2>
        <div class="admin-photo">
          <div class="admin-photo-preview" id="photoPreview" style="${photo ? `background-image:url('${escapeHtml(photo)}')` : ""}">${photo ? "" : "<span>Aucune photo</span>"}</div>
          <div class="admin-photo-actions">
            <label class="admin-add admin-file">Choisir une photo sur mon PC<input type="file" id="photoFile" accept="image/jpeg,image/png,image/webp" hidden></label>
            <label>ou colle un lien d’image (https://…)
              <span class="admin-inline"><input class="admin-input" id="photoUrl" value="${photo.startsWith("https") ? escapeHtml(photo) : ""}" placeholder="https://…"><button class="admin-btn" type="button" id="photoUrlSave">Utiliser ce lien</button></span>
            </label>
            ${photo ? `<button class="admin-btn danger" type="button" id="photoRemove">Retirer la photo</button>` : ""}
          </div>
        </div>
        <div class="admin-subhead">
          <h2 class="admin-subtitle">Événements entreprises</h2>
          <div class="admin-row-actions">
            <button class="admin-btn" type="button" id="addEvent">+ Ajouter un événement</button>
            <button class="admin-add" type="button" id="saveEvents">Enregistrer les événements</button>
          </div>
        </div>
        <p class="muted admin-help">Ils s’affichent dans le calendrier de la semaine sur l’accueil (avec des flèches pour passer d’une semaine à l’autre).</p>
        <div id="eventList" class="admin-list">${data.events.map(eventRow).join("") || ""}</div>`;
    },

    look() {
      const current = data.site.theme || "or";
      return `${head("Apparence du site", "Choisis la couleur principale du site. Elle s’applique à toutes les pages et au panel.")}
        <div class="admin-themes">${data.colorThemes
          .map(
            (t) => `<button class="admin-theme${t.id === current ? " active" : ""}" type="button" data-theme-id="${t.id}">
              <span class="admin-theme-swatch" data-theme="${t.id}"><i></i><i></i><i></i></span>
              <strong>${escapeHtml(t.label)}</strong>
              <span>${t.id === current ? "Thème actuel" : "Appliquer"}</span>
            </button>`
          )
          .join("")}</div>`;
    },

    rules() {
      const cats = data.categories;
      const subOptions = (cat, sub) =>
        `<option value="">Tout le thème</option>` +
        (cats.find((c) => c.id === cat)?.subs || []).map((s) => `<option value="${s.id}"${s.id === sub ? " selected" : ""}>${escapeHtml(s.label)}</option>`).join("");
      const cardRow = (c) => `<article class="admin-card-row" data-id="${escapeHtml(c.id)}">
          <span class="admin-thumb" style="background-image:url('${escapeHtml(c.image)}')"></span>
          <div class="admin-card-fields">
            <input class="admin-input f-label" value="${escapeHtml(c.label)}" maxlength="60" placeholder="Nom de la carte">
            <input class="admin-input f-image" value="${escapeHtml(c.image)}" placeholder="Lien de l’image https://…">
            <div class="admin-inline">
              <select class="admin-input f-cat">${cats.map((x) => `<option value="${x.id}"${x.id === c.cat ? " selected" : ""}>${escapeHtml(x.label)}</option>`).join("")}</select>
              <select class="admin-input f-sub">${subOptions(c.cat, c.sub)}</select>
            </div>
          </div>
          <div class="admin-row-actions">
            <button class="admin-btn up" type="button">↑</button>
            <button class="admin-btn danger remove" type="button">Supprimer</button>
          </div>
        </article>`;
      const group = (g) => `<section class="admin-group" data-id="${escapeHtml(g.id)}">
          <div class="admin-group-head">
            <input class="admin-input f-group" value="${escapeHtml(g.label)}" maxlength="60" placeholder="Nom du groupe">
            <button class="admin-btn up-group" type="button">↑</button>
            <button class="admin-btn danger remove-group" type="button">Supprimer le groupe</button>
          </div>
          <div class="admin-cards">${g.cards.map(cardRow).join("")}</div>
          <button class="admin-btn add-card" type="button">+ Ajouter une carte</button>
        </section>`;
      SECTIONS.rules.cardRow = cardRow;
      SECTIONS.rules.group = group;
      SECTIONS.rules.subOptions = subOptions;
      return `${head("Règlement", "Groupes et cartes en photo de la page Règlement : noms, images et thème ouvert.", `<button class="admin-add" type="button" id="saveRules">Enregistrer</button>`)}
        <p class="muted admin-help">Les articles eux-mêmes se modifient sur la <a href="/reglement">page Règlement</a> (connecté en staff). Pour une image : sur Discord, clic droit sur une photo → « Copier le lien », puis colle-le ici.</p>
        <div id="ruleGroups">${data.site.themes.map(group).join("")}</div>
        <button class="admin-btn" type="button" id="addGroup">+ Ajouter un groupe</button>`;
    },

    links() {
      const field = (id, label, value, help) => `<article class="admin-row admin-row-form">
          <div>
            <strong>${label}</strong>
            <span>${help}</span>
          </div>
          <input class="admin-input wide" id="${id}" value="${escapeHtml(value || "")}" placeholder="https://discord.gg/…">
        </article>`;
      return `${head("Liens Discord", "Les liens d’invitation affichés sur le site.", `<button class="admin-add" type="button" id="saveLinks">Enregistrer</button>`)}
        <div class="admin-list">
          ${field("linkMain", "Discord principal", data.site.discord, "Boutons « Discord » en haut de chaque page, sur l’accueil et en bas du règlement.")}
          ${field("linkLegal", "Discord légal", data.site.links.legal, "Bouton « Discord légal » dans le règlement légal. Laisse vide pour le cacher.")}
          ${field("linkIllegal", "Discord illégal", data.site.links.illegal, "Bouton « Discord illégal » dans le règlement illégal. Laisse vide pour le cacher.")}
        </div>
        <p class="muted admin-help">Pour un lien qui n’expire pas : sur Discord, clic droit sur le serveur → Inviter des gens → Modifier le lien → Expiration : Jamais.</p>`;
    },

    texts() {
      const pages = [...new Set(data.texts.map((t) => t.page))];
      return `${head("Textes du site", "Tous les titres et textes modifiables. Laisse un champ vide pour revenir au texte d’origine.", `<button class="admin-add" type="button" id="saveTexts">Enregistrer</button>`)}
        ${pages
          .map(
            (page) => `<h2 class="admin-subtitle">${escapeHtml(page)}</h2>
          <div class="admin-list">${data.texts
            .filter((t) => t.page === page)
            .map(
              (t) => `<article class="admin-row admin-row-form">
                <div><strong>${escapeHtml(t.original)}</strong><span>${escapeHtml(t.key)}</span></div>
                <input class="admin-input wide f-text" data-key="${escapeHtml(t.key)}" value="${escapeHtml(t.value)}" placeholder="${escapeHtml(t.original)}">
              </article>`
            )
            .join("")}</div>`
          )
          .join("")}`;
    },

    annonces() {
      return `${head("Annonces Discord", "Le bot publie l’annonce dans le salon des annonces de ton Discord.")}
        <form class="admin-form" id="annonceForm">
          <label>Titre <input class="admin-input" name="title" required maxlength="200"></label>
          <label>Texte <textarea class="admin-input" name="text" rows="8" required maxlength="4000"></textarea></label>
          <label>Image (lien https, facultatif) <input class="admin-input" name="image" type="url"></label>
          <label>Mention
            <select class="admin-input" name="ping">
              <option value="everyone">@everyone</option>
              <option value="role">Le rôle des annonces</option>
              <option value="none">Personne</option>
            </select>
          </label>
          <button class="admin-add" type="submit">Publier sur Discord</button>
        </form>`;
    },

    team() {
      return `${head("Équipe", "L’organigramme se modifie directement sur l’accueil.")}
        <div class="admin-list">
          <article class="admin-row">
            <div><strong>${data.stats.team} membre(s) dans l’organigramme</strong><span>Niveaux, rôles, bios et synchronisation avec les rôles Discord.</span></div>
            <div class="admin-row-actions"><a class="admin-btn" href="/#equipe">Modifier l’équipe</a></div>
          </article>
        </div>`;
    },
  };

  // Photo réduite dans le navigateur avant l'envoi (plus léger et plus rapide)
  const shrink = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1920 / img.width);
        const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Image illisible."));
      img.src = URL.createObjectURL(file);
    });

  // ---------- Actions de chaque section ----------
  const BIND = {
    home() {
      $("#photoFile").onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        try {
          toast("Envoi de la photo…");
          data.site = await api("/api/home/photo", { method: "POST", body: JSON.stringify({ image: await shrink(file) }) });
          toast("Photo de l’accueil mise à jour ✔");
          render();
        } catch (err) {
          toast(err.message, true);
        }
      };
      $("#photoUrlSave").onclick = async () => (await save({ homePhoto: $("#photoUrl").value.trim() }, "Photo de l’accueil mise à jour ✔")) && render();
      if ($("#photoRemove")) $("#photoRemove").onclick = async () => (await save({ homePhoto: "" }, "Photo retirée")) && render();
      const wire = (root) => root.querySelectorAll(".remove-event").forEach((b) => (b.onclick = () => b.closest(".admin-event").remove()));
      wire(main);
      $("#addEvent").onclick = () => {
        $("#eventList").insertAdjacentHTML("afterbegin", SECTIONS.home.eventRow({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), time: "", title: "", company: "", place: "", description: "" }));
        wire($("#eventList").firstElementChild);
        $("#eventList .f-title").focus();
      };
      $("#saveEvents").onclick = async () => {
        const items = [...main.querySelectorAll(".admin-event")].map((row) => ({
          id: row.dataset.id,
          date: row.querySelector(".f-date").value,
          time: row.querySelector(".f-time").value,
          title: row.querySelector(".f-title").value,
          company: row.querySelector(".f-company").value,
          place: row.querySelector(".f-place").value,
          description: row.querySelector(".f-desc").value,
        }));
        try {
          data.events = (await api("/api/events", { method: "POST", body: JSON.stringify({ items }) })).items;
          toast("Événements enregistrés ✔");
          render();
        } catch (err) {
          toast(err.message, true);
        }
      };
    },

    look() {
      main.querySelectorAll("[data-theme-id]").forEach((b) => (b.onclick = async () => {
        const theme = b.dataset.themeId;
        if (await save({ theme }, "Thème appliqué à tout le site ✔")) {
          theme === "or" ? delete document.documentElement.dataset.theme : (document.documentElement.dataset.theme = theme);
          render();
        }
      }));
    },

    tabs() {
      main.querySelectorAll(".toggle").forEach((b) => (b.onclick = () => {
        const on = b.dataset.visible !== "true";
        b.dataset.visible = on;
        b.textContent = on ? "Visible" : "Masqué";
        b.className = `admin-pill toggle ${on ? "green" : "off"}`;
      }));
      $("#saveTabs").onclick = async () => {
        const tabs = Object.fromEntries([...main.querySelectorAll("[data-route]")].map((row) => [
          row.dataset.route,
          { label: row.querySelector(".f-label").value, visible: row.querySelector(".toggle")?.dataset.visible !== "false" },
        ]));
        if (await save({ tabs })) await reload();
      };
    },

    rules() {
      const { cardRow, group, subOptions } = SECTIONS.rules;
      const wire = (root) => {
        root.querySelectorAll(".remove").forEach((b) => (b.onclick = () => b.closest(".admin-card-row").remove()));
        root.querySelectorAll(".up").forEach((b) => (b.onclick = () => { const r = b.closest(".admin-card-row"); r.previousElementSibling && r.after(r.previousElementSibling); }));
        root.querySelectorAll(".remove-group").forEach((b) => (b.onclick = () => confirm("Supprimer ce groupe et ses cartes ?") && b.closest(".admin-group").remove()));
        root.querySelectorAll(".up-group").forEach((b) => (b.onclick = () => { const g = b.closest(".admin-group"); g.previousElementSibling && g.after(g.previousElementSibling); }));
        root.querySelectorAll(".add-card").forEach((b) => (b.onclick = () => {
          const box = b.previousElementSibling;
          box.insertAdjacentHTML("beforeend", cardRow({ id: crypto.randomUUID(), label: "", image: "", cat: "general", sub: "" }));
          wire(box.lastElementChild);
        }));
        root.querySelectorAll(".f-cat").forEach((s) => (s.onchange = () => (s.closest(".admin-card-row").querySelector(".f-sub").innerHTML = subOptions(s.value, ""))));
        root.querySelectorAll(".f-image").forEach((i) => (i.oninput = () => (i.closest(".admin-card-row").querySelector(".admin-thumb").style.backgroundImage = `url('${i.value.replace(/'/g, "")}')`)));
      };
      wire(main);
      $("#addGroup").onclick = () => {
        $("#ruleGroups").insertAdjacentHTML("beforeend", group({ id: crypto.randomUUID(), label: "Nouveau groupe", cards: [] }));
        wire($("#ruleGroups").lastElementChild);
      };
      $("#saveRules").onclick = async () => {
        const themes = [...main.querySelectorAll(".admin-group")].map((g) => ({
          id: g.dataset.id,
          label: g.querySelector(".f-group").value,
          cards: [...g.querySelectorAll(".admin-card-row")].map((c) => ({
            id: c.dataset.id,
            label: c.querySelector(".f-label").value,
            image: c.querySelector(".f-image").value.trim(),
            cat: c.querySelector(".f-cat").value,
            sub: c.querySelector(".f-sub").value,
          })),
        }));
        if (await save({ themes }, "Règlement enregistré ✔")) render();
      };
    },

    links() {
      $("#saveLinks").onclick = () =>
        save({ discord: $("#linkMain").value.trim(), links: { legal: $("#linkLegal").value.trim(), illegal: $("#linkIllegal").value.trim() } }, "Liens enregistrés ✔");
    },

    texts() {
      $("#saveTexts").onclick = async () => {
        const texts = Object.fromEntries([...main.querySelectorAll(".f-text")].map((i) => [i.dataset.key, i.value.trim()]));
        if (await save({ texts }, "Textes enregistrés ✔")) await reload();
      };
    },

    annonces() {
      $("#annonceForm").onsubmit = async (event) => {
        event.preventDefault();
        try {
          await api("/api/discord/annonce", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
          event.target.reset();
          toast("Annonce envoyée au bot ✔ Elle arrive sur Discord dans quelques secondes.");
        } catch (err) {
          toast(err.message, true);
        }
      };
    },
  };

  function render() {
    if (!SECTIONS[section]) section = "dashboard";
    document.querySelectorAll("#adminNav button").forEach((b) => b.classList.toggle("active", b.dataset.section === section));
    main.innerHTML = SECTIONS[section]();
    BIND[section]?.();
  }

  async function reload() {
    data = await api("/api/admin");
    render();
  }

  $("#adminNav").onclick = (event) => {
    const btn = event.target.closest("[data-section]");
    if (!btn) return;
    section = btn.dataset.section;
    history.replaceState(null, "", `#${section}`);
    render();
  };

  $("#adminLogout").onclick = async () => {
    await api("/api/staff/logout", { method: "POST", body: "{}" });
    location.reload();
  };

  // Connexion : réservé aux grades Fondateur, Fondatrice et Administrateur
  function loginScreen(message) {
    main.innerHTML = `${head("Connexion", message)}
      <form class="admin-form admin-login" id="adminLogin">
        <label>Grade
          <select class="admin-input" name="grade">
            <option value="fondateur">Fondateur</option>
            <option value="fondatrice">Fondatrice</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
        <label>Mot de passe <input class="admin-input" name="password" type="password" required autocomplete="current-password"></label>
        <button class="admin-add" type="submit">Entrer</button>
        <p class="muted" id="loginError"></p>
      </form>`;
    $("#adminLogin").onsubmit = async (event) => {
      event.preventDefault();
      try {
        await api("/api/staff/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
        start();
      } catch (err) {
        $("#loginError").textContent = err.message;
      }
    };
  }

  async function start() {
    await window.Staff.load();
    if (!window.Staff.can("panel")) {
      $("#adminNav").hidden = true;
      $("#adminLogout").hidden = !window.Staff.isStaff();
      return loginScreen(window.Staff.isStaff() ? "Ton grade n’a pas accès au panel : réservé aux Fondateurs et Administrateurs." : "Réservé aux Fondateurs et Administrateurs.");
    }
    $("#adminNav").hidden = false;
    $("#adminLogout").hidden = false;
    await reload();
  }

  start().catch((err) => (main.innerHTML = `<p class="admin-alert">${escapeHtml(err.message)}</p>`));
})();
