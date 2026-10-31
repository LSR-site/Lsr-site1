(() => {
  const authArea = document.querySelector("#authArea");
  const rulesView = document.querySelector("#rulesView");
  const rulesActions = document.querySelector("#rulesActions");
  const rulesMeta = document.querySelector("#rulesMeta");
  const rulesFilters = document.querySelector("#rulesFilters");
  const rulesHub = document.querySelector("#rulesHub");
  const rulesDetail = document.querySelector("#rulesDetail");
  const rulesBreadcrumb = document.querySelector("#rulesBreadcrumb");
  const rulesTitle = document.querySelector("#rulesTitle");
  const rulesLead = document.querySelector("#rulesLead");
  const leadText = rulesLead?.textContent || "";
  const saveStatus = document.querySelector("#saveStatus");
  const chapterLead = document.querySelector("#chapterLead");

  let me = null;
  let rules = { sections: [], categories: [] };
  let activeCat = null;
  let activeSub = "all";
  let editingId = null;
  let draftSection = null;

  const IMG = (id, extra = "") =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80${extra}`;

  const THEME_GROUPS = [
    {
      id: "global",
      label: "Règlement global",
      cards: [
        { id: "discord", label: "Règlement Discord", cat: "discord", image: IMG("1516321318423-f06f85e504b3") },
        { id: "general", label: "Règlement du serveur", cat: "general", image: IMG("1480714378408-67cf0d13bc1b") },
        { id: "rp", label: "RP & Vocal", cat: "rp", image: IMG("1507003211169-0a1dd7228f2d") },
        { id: "staff", label: "Interdictions & staff", cat: "staff", image: IMG("1560250097-0b93528c311a") },
        { id: "boutique", label: "Boutique", cat: "boutique", image: IMG("1544636331-e26879cd4d9b") },
      ],
    },
    {
      id: "illegal",
      label: "Règlement illégal",
      cards: [
        { id: "illegal", label: "Illégal", cat: "illegal", sub: "general-illegal", image: IMG("1514565131-fce0801e5785") },
        { id: "orgas", label: "Organisations", cat: "illegal", sub: "orgas", image: IMG("1529156069898-49953e39b3ac") },
        { id: "braquages", label: "Braquages", cat: "illegal", sub: "braquages", image: IMG("1556742049-0cfed4f6a45d") },
      ],
    },
    {
      id: "legal",
      label: "Règlement légal",
      cards: [
        { id: "services", label: "Services publics", cat: "legal", sub: "services", image: IMG("1540962351504-03099e0a754b") },
        { id: "gouvernement", label: "Gouvernement", cat: "legal", sub: "gouvernement", image: IMG("1600596542815-ffad4c1539a9") },
        { id: "justice", label: "Justice & DOJ", cat: "legal", sub: "justice", image: IMG("1589829545856-d10d557cf95f") },
        { id: "ems", label: "EMS", cat: "legal", sub: "ems", image: IMG("1516549655169-df83a0774514") },
      ],
    },
  ];

  const allCards = () => THEME_GROUPS.flatMap((group) => group.cards);

  const currentCard = () =>
    allCards().find((card) => card.cat === activeCat && (card.sub || "all") === activeSub) ||
    allCards().find((card) => card.cat === activeCat && !card.sub);

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  const formatContent = (value) => {
    const lines = String(value || "").split(/\r?\n/);
    const out = [];
    let list = [];
    const flushList = () => {
      if (!list.length) return;
      out.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
      list = [];
    };
    for (const line of lines) {
      const bullet = line.match(/^\s*[-•]\s+(.*)$/);
      if (bullet) {
        list.push(bullet[1]);
        continue;
      }
      flushList();
      if (!line.trim()) continue;
      if (/^-{3,}$/.test(line.trim())) {
        out.push('<hr class="code-rule">');
        continue;
      }
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
    flushList();
    return out.join("");
  };

  const tree = () =>
    (rules.categories && rules.categories.length ? rules.categories : window.RULE_CATEGORIES) || [];

  const categoryOf = (section) =>
    tree().find((cat) => cat.id === section.category) || tree()[0];

  const subsOf = (categoryId) =>
    categoryOf({ category: categoryId }).subs || [{ id: "autre", label: "Autre" }];

  const subOf = (section) => {
    const subs = subsOf(section.category);
    return subs.find((item) => item.id === section.subcategory) || subs[0];
  };

  const subLetter = (categoryId, subId) => {
    const index = subsOf(categoryId).findIndex((item) => item.id === subId);
    return String.fromCharCode(65 + Math.max(0, index));
  };

  const canEditRules = () => window.Staff.can("reglement");

  function setStatus(message) {
    saveStatus.textContent = message || "";
  }

  function renderAuth() {
    window.Staff.renderAuth(authArea);
  }

  function renderActions() {
    if (!canEditRules() || !activeCat) {
      rulesActions.innerHTML = "";
      return;
    }
    rulesActions.innerHTML = `<button class="btn btn-gold btn-compact" id="addSectionBtn" type="button">Ajouter un article</button>`;
    document.querySelector("#addSectionBtn").onclick = startAdd;
  }

  function themeHash(cat, sub) {
    return sub && sub !== "all" ? `#${cat}/${sub}` : `#${cat}`;
  }

  function readHash() {
    const raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) return { cat: null, sub: "all" };
    const [cat, sub] = raw.split("/");
    const card = allCards().find((item) => item.cat === cat && (item.sub || "all") === (sub || "all"));
    if (card) return { cat: card.cat, sub: card.sub || "all" };
    if (tree().some((item) => item.id === cat)) return { cat, sub: sub || "all" };
    return { cat: null, sub: "all" };
  }

  function openTheme(cat, sub = "all") {
    activeCat = cat;
    activeSub = sub || "all";
    if (themeHash(activeCat, activeSub) !== location.hash) {
      history.pushState(null, "", themeHash(activeCat, activeSub));
    }
    stopEdit();
    renderPage();
  }

  function closeTheme() {
    activeCat = null;
    activeSub = "all";
    if (location.hash) history.pushState(null, "", location.pathname);
    stopEdit();
    renderPage();
  }

  function renderMeta() {
    if (rules.updatedAt) {
      const when = new Date(rules.updatedAt).toLocaleString("fr-FR");
      rulesMeta.textContent = `Mise à jour ${when}${rules.updatedBy ? " · " + rules.updatedBy : ""}`;
    } else {
      rulesMeta.textContent = "Lecture publique · code en vigueur";
    }
  }

  function renderCover() {
    const card = currentCard();
    const cat = activeCat ? categoryOf({ category: activeCat }) : null;
    const sub = activeCat && activeSub !== "all" ? subsOf(activeCat).find((item) => item.id === activeSub) : null;
    if (!activeCat) {
      if (rulesBreadcrumb) {
        rulesBreadcrumb.innerHTML = `<a href="/">Accueil</a><span>/</span>Règlement`;
      }
      if (rulesTitle) rulesTitle.innerHTML = `<em>Le code</em> Los Santos Reborn`;
      if (rulesLead) {
        rulesLead.hidden = false;
        rulesLead.textContent = leadText;
      }
      return;
    }
    const label = card?.label || sub?.label || cat?.label || "Thème";
    if (rulesBreadcrumb) {
      rulesBreadcrumb.innerHTML = `<a href="/">Accueil</a><span>/</span><a href="/reglement">Règlement</a><span>/</span>${escapeHtml(label)}`;
    }
    if (rulesTitle) rulesTitle.innerHTML = `<em>Thème</em> ${escapeHtml(label)}`;
    if (rulesLead) rulesLead.hidden = true;
    if (chapterLead) chapterLead.textContent = label;
  }

  function cardCount(card) {
    return (rules.sections || []).filter((section) => {
      if (categoryOf(section).id !== card.cat) return false;
      if (!card.sub) return true;
      return subOf(section).id === card.sub;
    }).length;
  }

  function renderHub() {
    rulesHub.innerHTML = THEME_GROUPS.map((group) => {
      const cards = group.cards
        .map((card) => {
          const count = cardCount(card);
          return `<button class="rules-card" type="button" data-open-cat="${card.cat}" data-open-sub="${card.sub || "all"}">
            <span class="rules-card-photo" style="background-image:url('${escapeHtml(card.image)}')"></span>
            <span class="rules-card-label">${escapeHtml(card.label)}</span>
            <span class="rules-card-count">${count} article${count > 1 ? "s" : ""}</span>
          </button>`;
        })
        .join("");
      return `<section class="rules-theme">
        <h2>${escapeHtml(group.label)}</h2>
        <div class="rules-cards">${cards}</div>
      </section>`;
    }).join("");
  }

  function renderFilters() {
    if (rulesFilters) rulesFilters.innerHTML = "";
  }

  function renderPage() {
    const onHub = !activeCat;
    rulesHub.hidden = !onHub;
    rulesDetail.hidden = onHub;
    renderCover();
    renderMeta();
    renderActions();
    if (onHub) {
      renderHub();
      return;
    }
    renderFilters();
    renderView();
  }

  function sectionEditor(section) {
    const category = categoryOf(section).id;
    const subId = subOf(section).id;
    return `
      <article class="code-article is-editing" data-editing="${escapeHtml(section.id)}">
        <div>
          <input class="editor-title" value="${escapeHtml(section.title)}" maxlength="140" placeholder="Titre de l’article" />
          <div class="editor-row">
            <select class="editor-category">
              ${tree()
                .map(
                  (cat) =>
                    `<option value="${cat.id}"${cat.id === category ? " selected" : ""}>${escapeHtml(cat.label)}</option>`
                )
                .join("")}
            </select>
            <select class="editor-sub">
              ${subsOf(category)
                .map(
                  (entry) =>
                    `<option value="${entry.id}"${entry.id === subId ? " selected" : ""}>${escapeHtml(entry.label)}</option>`
                )
                .join("")}
            </select>
          </div>
          <textarea class="editor-content" rows="12" placeholder="Texte de cet article">${escapeHtml(section.content)}</textarea>
          <div class="editor-bar">
            <button class="btn btn-gold" type="button" data-save="${escapeHtml(section.id)}">Enregistrer cet article</button>
            <button class="btn btn-ghost" type="button" data-cancel-edit>Annuler</button>
          </div>
        </div>
      </article>`;
  }

  function sectionCard(section, index) {
    if (editingId === section.id) return sectionEditor(section);
    const num = String(index + 1).padStart(2, "0");
    const actions = canEditRules()
      ? `<div class="code-art-actions">
          <button class="code-ink" type="button" data-edit="${escapeHtml(section.id)}">Annoter</button>
          <button class="code-ink" type="button" data-move="up" data-id="${escapeHtml(section.id)}">Monter</button>
          <button class="code-ink" type="button" data-move="down" data-id="${escapeHtml(section.id)}">Descendre</button>
          <button class="code-ink" type="button" data-delete="${escapeHtml(section.id)}">Retirer</button>
        </div>`
      : "";
    return `
      <article class="code-article" data-id="${escapeHtml(section.id)}">
        <div class="code-art-num">
          <span>ART</span>
          <strong>${num}</strong>
        </div>
        <div class="code-art-body">
          <h2>${escapeHtml(section.title)}</h2>
          <div class="code-art-text">${formatContent(section.content)}</div>
          ${actions}
        </div>
      </article>`;
  }

  function visibleSections() {
    const sections = [...(rules.sections || [])];
    if (draftSection && draftSection.category === activeCat) {
      if (activeSub === "all" || draftSection.subcategory === activeSub) sections.unshift(draftSection);
    }
    return sections.filter((section) => {
      if (categoryOf(section).id !== activeCat) return false;
      if (activeSub === "all") return true;
      return subOf(section).id === activeSub;
    });
  }

  function renderView() {
    const filtered = visibleSections();
    if (!(rules.sections || []).length && !draftSection) {
      rulesView.innerHTML = `<p class="code-empty">Aucun article n’a encore été inscrit au code.</p>`;
      return;
    }
    if (!filtered.length) {
      rulesView.innerHTML = `<p class="code-empty">Cette sous-catégorie n’a pas encore d’article.</p>`;
      return;
    }
    if (activeSub !== "all") {
      rulesView.innerHTML = filtered.map((section, index) => sectionCard(section, index)).join("");
      return;
    }
    const groups = [];
    for (const entry of subsOf(activeCat)) {
      const items = filtered.filter((section) => subOf(section).id === entry.id);
      if (items.length) groups.push({ entry, items });
    }
    let art = 0;
    rulesView.innerHTML = groups
      .map(
        ({ entry, items }) => `
        <section class="code-subgroup">
          <header class="code-subhead">
            <span>§ ${subLetter(activeCat, entry.id)}</span>
            <h3>${escapeHtml(entry.label)}</h3>
          </header>
          ${items.map((section) => sectionCard(section, art++)).join("")}
        </section>`
      )
      .join("");
  }

  function stopEdit() {
    editingId = null;
    draftSection = null;
    if (activeCat) renderView();
  }

  function startEdit(id) {
    const section = (rules.sections || []).find((item) => item.id === id);
    if (!section) return;
    editingId = id;
    draftSection = null;
    setStatus("");
    renderView();
    rulesView.querySelector(".editor-title")?.focus();
  }

  function startAdd() {
    if (!activeCat) return;
    draftSection = {
      id: crypto.randomUUID(),
      category: activeCat,
      subcategory: activeSub === "all" ? subsOf(activeCat)[0]?.id : activeSub,
      title: "Nouvel article",
      content: "",
    };
    editingId = draftSection.id;
    setStatus("");
    renderView();
    rulesView.querySelector(".editor-title")?.focus();
    rulesView.querySelector(".editor-title")?.select();
  }

  function collectEditor() {
    const card = rulesView.querySelector("[data-editing]");
    if (!card) return null;
    return {
      id: card.dataset.editing,
      category: card.querySelector(".editor-category").value,
      subcategory: card.querySelector(".editor-sub").value,
      title: card.querySelector(".editor-title").value.trim(),
      content: card.querySelector(".editor-content").value,
    };
  }

  rulesHub.addEventListener("click", (event) => {
    const card = event.target.closest("[data-open-cat]");
    if (!card) return;
    openTheme(card.dataset.openCat, card.dataset.openSub || "all");
  });

  rulesDetail.addEventListener("click", (event) => {
    if (event.target.closest("[data-back-hub]")) closeTheme();
  });

  rulesBreadcrumb?.addEventListener("click", (event) => {
    const link = event.target.closest('a[href="/reglement"]');
    if (!link) return;
    event.preventDefault();
    closeTheme();
  });

  window.addEventListener("popstate", () => {
    const next = readHash();
    activeCat = next.cat;
    activeSub = next.sub;
    stopEdit();
    renderPage();
  });

  rulesView.addEventListener("change", (event) => {
    if (!event.target.classList.contains("editor-category")) return;
    const card = event.target.closest("[data-editing]");
    const subSelect = card?.querySelector(".editor-sub");
    if (!subSelect) return;
    const current = subSelect.value;
    const options = subsOf(event.target.value);
    subSelect.innerHTML = options
      .map((entry) => `<option value="${entry.id}">${escapeHtml(entry.label)}</option>`)
      .join("");
    subSelect.value = options.some((item) => item.id === current) ? current : options[0]?.id || "autre";
  });

  rulesView.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-edit]");
    if (editBtn) {
      startEdit(editBtn.dataset.edit);
      return;
    }

    if (event.target.closest("[data-cancel-edit]")) {
      stopEdit();
      setStatus("");
      return;
    }

    const saveBtn = event.target.closest("[data-save]");
    if (saveBtn) {
      const payload = collectEditor();
      if (!payload) return;
      setStatus("Enregistrement…");
      try {
        rules = await api("/api/reglement/section", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        activeCat = payload.category;
        activeSub = payload.subcategory || "all";
        stopEdit();
        renderPage();
        setStatus("Article enregistré.");
      } catch (err) {
        setStatus(err.message);
      }
      return;
    }

    const deleteBtn = event.target.closest("[data-delete]");
    if (deleteBtn) {
      const id = deleteBtn.dataset.delete;
      const section = (rules.sections || []).find((item) => item.id === id);
      const label = section?.title || "cette section";
      if (!confirm(`Supprimer « ${label} » ?`)) return;
      setStatus("Suppression…");
      try {
        rules = await api("/api/reglement/section/delete", {
          method: "POST",
          body: JSON.stringify({ id }),
        });
        stopEdit();
        renderPage();
        setStatus("Article retiré du code.");
      } catch (err) {
        setStatus(err.message);
      }
      return;
    }

    const moveBtn = event.target.closest("[data-move]");
    if (moveBtn) {
      setStatus("");
      try {
        rules = await api("/api/reglement/section/move", {
          method: "POST",
          body: JSON.stringify({ id: moveBtn.dataset.id, direction: moveBtn.dataset.move }),
        });
        renderPage();
      } catch (err) {
        setStatus(err.message);
      }
    }
  });

  async function init() {
    await window.Staff.load();
    me = window.Staff.me;
    rules = await api("/api/reglement");
    const next = readHash();
    activeCat = next.cat;
    activeSub = next.sub;
    renderAuth();
    renderPage();
  }

  init().catch(() => {
    rulesMeta.textContent = "Impossible de charger le règlement. Lance le site avec npm start.";
  });
})();
