(() => {
  const LOGIN_GRADES = [
    { id: "fondateur", label: "Fondateur", hint: "Modifier le site + tickets" },
    { id: "fondatrice", label: "Fondatrice", hint: "Modifier le site + tickets" },
    { id: "admin", label: "Administrateur", hint: "Répondre aux tickets" },
    { id: "modo", label: "Modérateur", hint: "Répondre aux tickets" },
    { id: "helper", label: "Helper", hint: "Répondre aux tickets" },
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
        <p class="muted">Helper, modo et admin répondent aux tickets. Seul le fondateur (ou la fondatrice) peut modifier le site.</p>
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
  Object.assign(window, { $, escapeHtml, api, initials });
  if ($("#year")) $("#year").textContent = new Date().getFullYear();

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
      bar.innerHTML = `<button class="btn btn-gold btn-compact" type="button" id="editOn">✎ Modifier le site</button>`;
      $("#editOn").onclick = on;
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
      document.querySelectorAll("[data-staff-nav]").forEach((link) => {
        link.hidden = !this.isStaff();
      });
      if (this.can("site")) editBar();
      if (!el) return;
      if (this.isStaff()) {
        el.innerHTML = `
          <div class="auth-chip">
            <span class="grade-badge grade-${escapeHtml(this.me.grade || "admin")}">${escapeHtml(this.gradeLabel())}</span>
            <span>${escapeHtml(this.me.username || "Staff")}</span>
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
