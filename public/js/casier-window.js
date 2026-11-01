(() => {
  const NOTE_LABEL = {
    comment: "Commentaire",
    concern: "Point dérangeant",
    sanction: "Sanction écrite",
    vocal: "Vocal",
    system: "Système",
  };

  const WL_STATUS = {
    pending: "Demande",
    casier: "En attente de vocal",
    accepted: "WL acceptée",
    refused: "WL refusée",
  };

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function ensure() {
    if (document.querySelector("#casierWindow")) return document.querySelector("#casierWindow");
    const box = document.createElement("div");
    box.id = "casierWindow";
    box.className = "casier-window";
    box.hidden = true;
    box.innerHTML = `
      <div class="casier-frame" role="dialog" aria-modal="true" aria-labelledby="casierTitle">
        <div id="casierMount"></div>
      </div>`;
    box.addEventListener("click", (event) => {
      if (event.target === box) window.CasierWindow.close();
    });
    document.body.append(box);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !box.hidden) window.CasierWindow.close();
    });
    return box;
  }

  function block(title, text) {
    return `
      <article class="casier-block">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(text || "—")}</p>
      </article>`;
  }

  function dossier(wl) {
    if (!wl) return `<p class="muted">Aucun dossier WL lié.</p>`;
    return `
      <div class="casier-wlbar">
        <p class="wl-status wl-status-${escapeHtml(wl.status)}">${escapeHtml(WL_STATUS[wl.status] || wl.status)}</p>
        <p class="muted">Demande #${wl.number} · envoyée le ${escapeHtml(formatDate(wl.createdAt))}</p>
      </div>
      ${block("Histoire du personnage", wl.story)}
      ${block("Expérience RP", wl.experience)}
      ${block("Motivation", wl.motivation)}`;
  }

  // Filtre du journal : tout, sanctions, points dérangeants…
  let noteFilter = "all";
  function noteTabs(list) {
    const all = list || [];
    return [["all", "Tout", all.length], ...Object.entries(NOTE_LABEL).map(([id, label]) => [id, label, all.filter((n) => n.kind === id).length])]
      .filter(([id, , n]) => id === "all" || n)
      .map(([id, label, n]) => `<button class="filter-chip${id === noteFilter ? " active" : ""}" type="button" data-note-filter="${id}">${escapeHtml(label)} <b>${n}</b></button>`)
      .join("");
  }

  function notes(list) {
    if (!list?.length) return `<p class="muted">Aucun commentaire pour l’instant. Tout ce que tu écris ici reste staff.</p>`;
    const shown = noteFilter === "all" ? list : list.filter((n) => n.kind === noteFilter);
    if (!shown.length) return `<p class="muted">Rien dans cette catégorie.</p>`;
    return shown
      .map(
        (note) => `
        <article class="casier-note casier-note-${escapeHtml(note.kind)}">
          <header>
            <strong>${escapeHtml(NOTE_LABEL[note.kind] || note.kind)}</strong>
            <span>${escapeHtml(note.createdBy)} · ${escapeHtml(formatDate(note.createdAt))}</span>
          </header>
          <p>${escapeHtml(note.text)}</p>
        </article>`
      )
      .join("");
  }

  function decision(wl) {
    if (!wl || wl.status !== "casier") return "";
    return `
      <div class="casier-decision">
        <h3>Décision après vocal</h3>
        <p class="muted">Interdit tant que le vocal n’est pas fait. Le compte-rendu reste dans le casier.</p>
        <label>Compte-rendu du vocal
          <textarea id="casierVocalNote" rows="3" maxlength="800" placeholder="Points abordés, attitude, ce qui dérange…">${escapeHtml(wl.vocalNote || "")}</textarea>
        </label>
        <label>Message au joueur
          <textarea id="casierPlayerNote" rows="2" maxlength="500" placeholder="Visible par le candidat uniquement.">${escapeHtml(wl.staffNote || "")}</textarea>
        </label>
        <div class="wl-actions">
          <button class="btn btn-gold" type="button" data-wl-status="accepted">Accepter après vocal</button>
          <button class="btn btn-ghost" type="button" data-wl-status="refused">Refuser après vocal</button>
        </div>
      </div>`;
  }

  function render(casier) {
    const wl = casier.whitelist;
    const mount = document.querySelector("#casierMount");
    mount.innerHTML = `
      <header class="casier-head">
        <div>
          <p class="kicker">Casier staff · confidentiel</p>
          <h2 id="casierTitle">#${casier.number} · ${escapeHtml(casier.name)}</h2>
        </div>
        <div class="casier-head-actions">
          <button class="btn btn-ghost" type="button" id="casierClose">Fermer</button>
          <button class="btn btn-ghost" type="button" id="casierDelete">Supprimer</button>
        </div>
      </header>
      <div class="casier-facts">
        <div><span>Discord</span><strong>${escapeHtml(casier.discord)}</strong></div>
        <div><span>Âge</span><strong>${escapeHtml(casier.age)} ans</strong></div>
        <div><span>Micro</span><strong>${escapeHtml(casier.mic)}</strong></div>
        <div><span>Ouvert par</span><strong>${escapeHtml(casier.openedBy)}</strong></div>
        <div><span>Sanctions</span><strong>${casier.sanctionCount}</strong></div>
        <div><span>Points dérangeants</span><strong>${casier.concernCount}</strong></div>
      </div>
      <div class="casier-body">
        <section class="casier-col">
          <h3>Dossier joueur</h3>
          ${dossier(wl)}
          ${decision(wl)}
        </section>
        <section class="casier-col casier-journal">
          <div class="casier-journal-top">
            <h3>Journal staff</h3>
            <p class="muted">Commentaires et sanctions invisibles pour le joueur. Le casier reste après la WL.</p>
          </div>
          <div class="filter-chips casier-note-tabs">${noteTabs(casier.notes)}</div>
          <div class="casier-feed">${notes(casier.notes)}</div>
          <form id="casierNoteForm" class="casier-composer">
            <label>Type
              <select name="kind">
                <option value="comment">Commentaire</option>
                <option value="concern">Point dérangeant</option>
                <option value="sanction">Sanction écrite</option>
              </select>
            </label>
            <label>Note interne
              <textarea name="text" rows="3" required minlength="3" maxlength="2000" placeholder="Ce qui dérange, le contexte, la sanction…"></textarea>
            </label>
            <button class="btn btn-gold" type="submit">Ajouter au casier</button>
            <p class="muted" id="casierError"></p>
          </form>
        </section>
      </div>`;
    // Changer de filtre ne touche pas à la note en cours d'écriture
    mount.querySelector(".casier-note-tabs").onclick = (event) => {
      const b = event.target.closest("[data-note-filter]");
      if (!b) return;
      noteFilter = b.dataset.noteFilter;
      mount.querySelector(".casier-note-tabs").innerHTML = noteTabs(casier.notes);
      mount.querySelector(".casier-feed").innerHTML = notes(casier.notes);
    };
    document.querySelector("#casierClose").onclick = () => window.CasierWindow.close();
    document.querySelector("#casierDelete").onclick = () => window.CasierWindow.remove(casier);
    document.querySelector("#casierNoteForm").onsubmit = async (event) => {
      event.preventDefault();
      const error = document.querySelector("#casierError");
      error.textContent = "";
      const form = new FormData(event.target);
      try {
        const data = await api(`/api/casiers/${casier.id}/notes`, {
          method: "POST",
          body: JSON.stringify({ kind: form.get("kind"), text: form.get("text") }),
        });
        render(data.casier);
        window.dispatchEvent(new CustomEvent("casier:changed", { detail: data.casier }));
      } catch (err) {
        error.textContent = err.message;
      }
    };
    mount.querySelectorAll("[data-wl-status]").forEach((btn) => {
      btn.onclick = async () => {
        const error = document.querySelector("#casierError") || mount.querySelector(".casier-decision");
        try {
          const data = await api(`/api/whitelist/${wl.id}/status`, {
            method: "POST",
            body: JSON.stringify({
              status: btn.dataset.wlStatus,
              vocalNote: document.querySelector("#casierVocalNote")?.value || "",
              staffNote: document.querySelector("#casierPlayerNote")?.value || "",
            }),
          });
          render(data.casier);
          window.dispatchEvent(new CustomEvent("casier:changed", { detail: data.casier }));
        } catch (err) {
          const line = document.querySelector("#casierError");
          if (line) line.textContent = err.message;
          else alert(err.message);
        }
      };
    });
  }

  window.CasierWindow = {
    currentId: "",
    async open(casierId) {
      if (!casierId) return;
      const box = ensure();
      if (this.currentId !== casierId) noteFilter = "all";
      this.currentId = casierId;
      box.hidden = false;
      document.body.classList.add("casier-open");
      document.querySelector("#casierMount").innerHTML = `<p class="muted" style="padding:24px">Ouverture du casier…</p>`;
      const data = await api(`/api/casiers/${casierId}`);
      render(data.casier);
    },
    close() {
      const box = document.querySelector("#casierWindow");
      if (box) box.hidden = true;
      this.currentId = "";
      document.body.classList.remove("casier-open");
    },
    async remove(casier) {
      const name = casier?.name || "ce joueur";
      if (!casier?.id) return;
      if (!confirm(`Supprimer le casier de ${name} ? Les commentaires et sanctions seront perdus.`)) return;
      await api(`/api/casiers/${casier.id}/delete`, { method: "POST", body: "{}" });
      this.close();
      window.dispatchEvent(new CustomEvent("casier:changed", { detail: { id: casier.id, deleted: true } }));
    },
  };
})();
