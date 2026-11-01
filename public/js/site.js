(() => {
  const LOGIN_GRADES = [
    { id: "fondateur", label: "Fondateur", hint: "Tout + panel admin" },
    { id: "fondatrice", label: "Fondatrice", hint: "Tout + panel admin" },
    { id: "admin", label: "Administrateur", hint: "Tout + panel admin" },
    { id: "modo", label: "Modérateur", hint: "Tickets, WL, casiers, règlement, événements" },
    { id: "helper", label: "Helper", hint: "Tickets, WL, casiers, règlement, événements" },
    { id: "recruteur", label: "Recruteur", hint: "Demandes WL, casiers, règlement" },
  ];

  const escapeHtml = (value) =>
    String(value || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  async function api(url, options) {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    return data;
  }

  function ensureModal() {
    if (document.querySelector("#staffModal")) return;
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "staffModal";
    modal.innerHTML = `
      <form class="modal-card" id="staffForm">
        <h2>Connexion staff</h2>
        <p class="muted">Tout le staff peut modifier le règlement. Les recruteurs gèrent les demandes WL et les casiers. Fondateurs et admins ont le panel.</p>
        <label>Grade
          <select name="grade" required>
            ${LOGIN_GRADES.map(
              (grade) =>
                `<option value="${grade.id}">${escapeHtml(grade.label)} — ${escapeHtml(grade.hint)}</option>`
            ).join("")}
          </select>
        </label>
        <label>Mot de passe staff <input name="password" type="password" required autocomplete="current-password" /></label>
        <div class="modal-actions">
          <button class="btn btn-gold" type="submit">Entrer</button>
          <button class="btn btn-ghost" id="closeStaff" type="button">Fermer</button>
        </div>
        <p class="muted" id="staffError"></p>
      </form>`;
    document.body.append(modal);
    modal.addEventListener("click", (e) => {
      if (e.target.id === "staffModal") modal.classList.remove("open");
    });
    document.querySelector("#closeStaff").onclick = () => modal.classList.remove("open");
    document.querySelector("#staffForm").onsubmit = async (event) => {
      event.preventDefault();
      const error = document.querySelector("#staffError");
      error.textContent = "";
      try {
        await api("/api/staff/login", {
          method: "POST",
          body: JSON.stringify({
            grade: event.target.grade.value,
            password: event.target.password.value,
          }),
        });
        location.reload();
      } catch (err) {
        error.textContent = err.message;
      }
    };
  }

  const $ = (sel) => document.querySelector(sel);
  const initials = (name) =>
    escapeHtml(
      String(name || "?")
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase()
    );
  // Alerte staff en haut de page (ex. bot Discord pas relié)
  const botWarning = (message) => {
    let box = $("#botWarning");
    if (!message) return box?.remove();
    if (!box) {
      box = Object.assign(document.createElement("p"), { id: "botWarning", className: "bot-warning" });
      const hero = document.querySelector(".page-hero");
      hero ? hero.after(box) : document.querySelector("main")?.prepend(box);
    }
    box.textContent = `⚠️ ${message}`;
  };
  // Calendrier semaine par semaine (accueil et planning WL)
  // root contient .agenda-nav (‹ libellé › Cette semaine) et .agenda-week ; dayHtml(dateIso) donne le contenu d'un jour
  function weekCalendar(root, dayHtml) {
    const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const pad = (n) => String(n).padStart(2, "0");
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const today = new Date();
    const thisMonday = addDays(today, -((today.getDay() + 6) % 7));
    let monday = thisMonday;
    const short = (d, year) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}) });
    root.querySelector(".agenda-nav").innerHTML = `
      <button class="btn btn-ghost btn-compact agenda-prev" type="button" aria-label="Semaine précédente">‹</button>
      <strong></strong>
      <button class="btn btn-ghost btn-compact agenda-next" type="button" aria-label="Semaine suivante">›</button>
      <button class="btn btn-ghost btn-compact agenda-today" type="button" hidden>Cette semaine</button>`;
    const render = () => {
      const sunday = addDays(monday, 6);
      root.querySelector(".agenda-nav strong").textContent = `Semaine du ${short(monday, monday.getFullYear() !== sunday.getFullYear())} au ${short(sunday, true)}`;
      root.querySelector(".agenda-today").hidden = iso(monday) === iso(thisMonday);
      root.querySelector(".agenda-week").innerHTML = DAYS.map((name, i) => {
        const day = addDays(monday, i);
        const inner = dayHtml(iso(day));
        return `<section class="agenda-day${iso(day) === iso(today) ? " today" : ""}${inner ? " has" : ""}">
            <header><span>${name}</span><b>${day.getDate()}</b></header>
            ${inner || `<p class="agenda-empty">—</p>`}
          </section>`;
      }).join("");
    };
    root.querySelector(".agenda-prev").onclick = () => ((monday = addDays(monday, -7)), render());
    root.querySelector(".agenda-next").onclick = () => ((monday = addDays(monday, 7)), render());
    root.querySelector(".agenda-today").onclick = () => ((monday = thisMonday), render());
    render();
    return { render, goTo: (date) => ((monday = addDays(new Date(`${date}T12:00:00`), -((new Date(`${date}T12:00:00`).getDay() + 6) % 7))), render()) };
  }

  // Image choisie sur le PC, réduite dans le navigateur (carrée si size est donné)
  const shrinkImage = (file, max = 1920, square = false) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const [sw, sh] = square ? [side, side] : [img.width, img.height];
        const scale = Math.min(1, max / Math.max(sw, sh));
        const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(sw * scale), height: Math.round(sh * scale) });
        canvas.getContext("2d").drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Image illisible."));
      img.src = URL.createObjectURL(file);
    });

  // Organigramme : catégories (avec sous-catégories) et membres. edit = cases déplaçables (panel)
  function orgChart(home, edit = false) {
    const levels = home.levels || [];
    const team = home.team || [];
    const children = (id) => levels.filter((l) => (l.parent || "") === id);
    const people = (id) => team.filter((m) => m.level === id);
    const shown = (l) => edit || people(l.id).length || children(l.id).some(shown);
    const firstTop = levels.find((l) => !l.parent);
    const drag = (kind, id) => (edit ? ` draggable="true" data-drag="${kind}" data-id="${escapeHtml(id)}"` : "");
    const card = (m, top) => `
      <article class="org-node">
        <div class="org-card"${drag("member", m.id)}>
          ${m.photo ? `<img class="org-photo" src="${escapeHtml(m.photo)}" alt="" draggable="false" />` : `<span class="org-initials">${initials(m.name)}</span>`}
          <h3>${escapeHtml(m.name || "Nouveau membre")}</h3>
          ${m.role ? `<span class="grade-badge${top ? " grade-fondateur" : ""}">${escapeHtml(m.role)}</span>` : ""}
          ${m.bio ? `<p class="muted">${escapeHtml(m.bio)}</p>` : ""}
        </div>
      </article>`;
    // Une catégorie : son nom, puis sur une même ligne ses membres et ses sous-catégories
    const group = (l, depth) => {
      const nodes = [
        ...people(l.id).map((m) => card(m, depth === 0 && l === firstTop)),
        ...children(l.id).filter(shown).map((sub) => `<div class="org-node org-branch">${group(sub, depth + 1)}</div>`),
      ];
      return `
        <section class="org-level org-depth-${Math.min(depth, 3)}">
          <p class="kicker org-label"${drag("group", l.id)}>${l.logo ? `<img src="${escapeHtml(l.logo)}" alt="" draggable="false" />` : ""}${escapeHtml(l.name || "Catégorie")}</p>
          ${nodes.length ? `<div class="org-row">${nodes.join("")}</div>` : edit ? `<p class="org-drop-hint">Glisse une case ici</p>` : ""}
        </section>`;
    };
    if (!levels.length) return team.length ? `<section class="org-level"><div class="org-row">${team.map((m) => card(m)).join("")}</div></section>` : "";
    const lost = team.filter((m) => !levels.some((l) => l.id === m.level));
    return children("").filter(shown).map((l) => group(l, 0)).join("") + (lost.length ? `<section class="org-level"><div class="org-row">${lost.map((m) => card(m)).join("")}</div></section>` : "");
  }

  Object.assign(window, { $, escapeHtml, api, initials, botWarning, weekCalendar, shrinkImage, orgChart });
  if ($("#year")) $("#year").textContent = new Date().getFullYear();

  // Annonce publiée par le bot dans le salon des annonces Discord
  function annonce() {
    let modal = $("#annonceModal");
    if (!modal) {
      modal = Object.assign(document.createElement("div"), { className: "modal", id: "annonceModal" });
      modal.innerHTML = `
        <form class="modal-card" id="annonceForm">
          <h2>Annonce Discord</h2>
          <p class="muted">Le bot la publie dans le salon des annonces.</p>
          <label>Titre <input name="title" required maxlength="200" /></label>
          <label>Texte <textarea name="text" rows="6" required maxlength="4000"></textarea></label>
          <label>Image (lien https, facultatif) <input name="image" type="url" /></label>
          <label>Mention
            <select name="ping">
              <option value="everyone">@everyone</option>
              <option value="role">Le rôle des annonces</option>
              <option value="none">Personne</option>
            </select>
          </label>
          <div class="modal-actions">
            <button class="btn btn-gold" type="submit">Publier sur Discord</button>
            <button class="btn btn-ghost" type="button" id="annonceClose">Fermer</button>
          </div>
          <p class="muted" id="annonceStatus"></p>
        </form>`;
      document.body.append(modal);
      $("#annonceClose").onclick = () => modal.classList.remove("open");
      $("#annonceForm").onsubmit = async (event) => {
        event.preventDefault();
        const status = $("#annonceStatus");
        status.textContent = "Publication…";
        try {
          await api("/api/discord/annonce", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
          event.target.reset();
          status.textContent = "✅ Annonce publiée sur Discord.";
        } catch (err) {
          status.textContent = err.message;
        }
      };
    }
    modal.classList.add("open");
  }

  // Mode édition : le fondateur clique sur les textes du site pour les changer
  function editBar() {
    if ($("#editBar")) return;
    const fields = [...document.querySelectorAll("[data-edit]")];
    if (!fields.length) return;
    const bar = document.createElement("div");
    bar.id = "editBar";
    bar.className = "edit-bar";
    document.body.append(bar);
    const discord = document.querySelector('a[href^="https://discord"]')?.href || "";
    const off = () => {
      document.body.classList.remove("editing");
      fields.forEach((el) => el.removeAttribute("contenteditable"));
      bar.innerHTML = `
        <button class="btn btn-gold btn-compact" type="button" id="editOn">✎ Modifier le site</button>
        <button class="btn btn-ghost btn-compact" type="button" id="annonceOn">📢 Annonce Discord</button>`;
      $("#editOn").onclick = on;
      $("#annonceOn").onclick = annonce;
    };
    const on = () => {
      document.body.classList.add("editing");
      fields.forEach((el) => {
        el.dataset.before = el.innerText;
        el.setAttribute("contenteditable", "plaintext-only");
      });
      bar.innerHTML = `
        <span>Clique sur un texte encadré pour le changer.</span>
        <label>Lien Discord <input id="editDiscord" type="url" value="${escapeHtml(discord)}"></label>
        <button class="btn btn-gold btn-compact" type="button" id="editSave">Enregistrer</button>
        <button class="btn btn-ghost btn-compact" type="button" id="editCancel">Annuler</button>
        <em id="editError"></em>`;
      $("#editCancel").onclick = () => location.reload();
      $("#editSave").onclick = async () => {
        const texts = {};
        fields.forEach((el) => {
          const value = el.innerText.trim();
          if (value && value !== el.dataset.before.trim()) texts[el.dataset.edit] = value;
        });
        try {
          await api("/api/site", { method: "POST", body: JSON.stringify({ texts, discord: $("#editDiscord").value.trim() }) });
          location.reload();
        } catch (err) {
          $("#editError").textContent = err.message;
        }
      };
    };
    // Pas de navigation quand on clique sur un bouton à modifier
    document.addEventListener("click", (event) => {
      if (document.body.classList.contains("editing") && event.target.closest("[data-edit]")) event.preventDefault();
    }, true);
    off();
  }

  window.LOGIN_GRADES = LOGIN_GRADES;

  window.Staff = {
    me: null,
    async load() {
      this.me = await api("/api/me");
      return this.me;
    },
    isStaff() {
      return Boolean(this.me?.isStaff || this.me?.canEdit);
    },
    can(perm) {
      if (!this.isStaff()) return false;
      const perms = this.me?.perms || [];
      return perms.includes("all") || perms.includes(perm);
    },
    gradeLabel() {
      return this.me?.gradeLabel || "Staff";
    },
    openLogin() {
      ensureModal();
      document.querySelector("#staffModal").classList.add("open");
    },
    renderAuth(el) {
      // Onglet réservé (ex. Casiers) : visible si le grade a le droit, sauf s'il est masqué dans le panel
      document.querySelectorAll("[data-staff-nav]").forEach((link) => {
        link.hidden = link.hasAttribute("data-tab-off") || !this.can(link.dataset.staffNav || "casiers");
      });
      if (this.can("site")) editBar();
      if (!el) return;
      if (this.isStaff()) {
        el.innerHTML = `
          <div class="auth-chip">
            <span class="grade-badge grade-${escapeHtml(this.me.grade || "admin")}">${escapeHtml(this.gradeLabel())}</span>
            <span>${escapeHtml(this.me.username || "Staff")}</span>
            ${this.can("panel") ? `<a class="text-btn" href="/admin">Panel</a>` : ""}
            <button class="text-btn" id="staffLogout" type="button">Quitter</button>
          </div>`;
        document.querySelector("#staffLogout").onclick = async () => {
          await api("/api/staff/logout", { method: "POST", body: "{}" });
          location.reload();
        };
        return;
      }
      el.innerHTML = `<button class="btn btn-ghost" id="staffLogin" type="button">Connexion staff</button>`;
      document.querySelector("#staffLogin").onclick = () => this.openLogin();
    },
  };
})();

(() => {
  const btn = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#siteNav");
  if (!btn || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("open", open);
    btn.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  };

  btn.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
})();
