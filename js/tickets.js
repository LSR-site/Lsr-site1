(() => {
  const STORAGE_KEY = "fairplay.tickets";

  let tickets = [];
  let categories = [];
  let currentId = "";
  let staff = false;
  let selectedCat = "";

  function savedKeys() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function forget(id) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedKeys().filter((item) => item.id !== id)));
  }

  function resetOpening() {
    currentId = "";
    history.replaceState({}, "", "/tickets");
    $("#ticketForm")?.reset();
    selectedCat = "";
    renderCategories();
    $("#ticketError").textContent = "";
    $("#replyError").textContent = "";
    $("#replyForm")?.reset();
    renderList();
    renderThread(null);
  }

  function remember(ticket) {
    if (!ticket?.id || !ticket.key) return;
    const list = savedKeys().filter((item) => item.id !== ticket.id);
    list.unshift({ id: ticket.id, key: ticket.key });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  }

  function ticketKey(id) {
    return savedKeys().find((item) => item.id === id)?.key || "";
  }

  function isImageUrl(url) {
    return /^https:\/\//i.test(url) && /(\.png|\.jpe?g|\.gif|\.webp|\.avif)(\?|$)/i.test(url);
  }

  function formatText(text) {
    const urlRe = /(https:\/\/[^\s<]+)/gi;
    return String(text || "")
      .split(urlRe)
      .map((part) => {
        if (/^https:\/\//i.test(part)) {
          const safe = escapeHtml(part);
          if (isImageUrl(part)) return `<img class="ticket-photo" src="${safe}" alt="">`;
          return `<a class="ticket-link" href="${safe}" target="_blank" rel="noreferrer">${safe}</a>`;
        }
        return escapeHtml(part).replace(/\n/g, "<br>");
      })
      .join("");
  }

  function mediaHTML(message) {
    const image = message.image && /^https:\/\//i.test(message.image)
      ? `<a href="${escapeHtml(message.image)}" target="_blank" rel="noreferrer"><img class="ticket-photo" src="${escapeHtml(message.image)}" alt="Photo du ticket"></a>`
      : "";
    const link =
      message.link && /^https:\/\//i.test(message.link) && message.link !== message.image
        ? `<a class="ticket-link" href="${escapeHtml(message.link)}" target="_blank" rel="noreferrer">${escapeHtml(message.link)}</a>`
        : "";
    return `${image}${link}`;
  }

  function initials(name) {
    return escapeHtml(
      String(name || "FP")
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase()
    );
  }

  function lastPreview(ticket) {
    const last = (ticket.messages || []).at(-1);
    if (!last) return "Nouveau ticket";
    if (last.image) return "Photo";
    if (last.link) return last.link;
    return last.content || "Message";
  }

  function when(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderCategories() {
    const box = $("#ticketCategories");
    const hidden = $("#ticketCategory");
    if (!box || !hidden) return;
    hidden.value = selectedCat;
    const groups = [
      { id: "general", label: "Général" },
      { id: "boutique", label: "Boutique" },
    ];
    box.innerHTML = groups
      .map((group) => {
        const items = categories.filter((item) => (item.group || "general") === group.id);
        if (!items.length) return "";
        return `<div class="ticket-cat-group">
          <p class="kicker">${escapeHtml(group.label)}</p>
          ${items
            .map(
              (item) => `
            <button class="ticket-cat${item.id === selectedCat ? " active" : ""}" data-cat="${escapeHtml(item.id)}" type="button">
              <span class="ticket-cat-icon">${escapeHtml(item.icon || "🎫")}</span>
              <span class="ticket-cat-text">
                <strong>${escapeHtml(item.label)}</strong>
                <span class="muted">${escapeHtml(item.hint || "")}</span>
              </span>
            </button>`
            )
            .join("")}
        </div>`;
      })
      .join("");
  }

  function renderList() {
    const box = $("#ticketList");
    if (!tickets.length) {
      box.innerHTML = `<p class="empty">Aucun ticket pour le moment.</p>`;
      return;
    }
    box.innerHTML = tickets
      .map(
        (ticket) => `
        <button class="ticket-item${ticket.id === currentId ? " active" : ""}" data-id="${ticket.id}" type="button">
          <span class="grade-badge grade-helper">Ouvert</span>
          <strong>#${ticket.number} · ${escapeHtml(ticket.subject)}</strong>
          <span class="muted">${escapeHtml(ticket.categoryLabel)} · ${escapeHtml(ticket.authorName)}</span>
          <span class="ticket-item-preview">${escapeHtml(lastPreview(ticket))}</span>
        </button>`
      )
      .join("");
  }

  function renderThread(ticket) {
    if (!ticket) {
      $("#threadView").hidden = true;
      $("#threadEmpty").hidden = false;
      return;
    }
    $("#threadEmpty").hidden = true;
    $("#threadView").hidden = false;
    $("#threadCat").textContent = ticket.categoryLabel;
    $("#threadTitle").textContent = `#${ticket.number} · ${ticket.subject}`;
    $("#threadMeta").textContent = ticket.authorName;
    $("#closeTicket").hidden = false;
    $("#replyForm").hidden = ticket.status !== "open";
    $("#threadMessages").innerHTML = (ticket.messages || [])
      .map((message) => {
        const isPlayer = message.from === "player";
        const name = isPlayer ? message.author : "Staff";
        const avatar = isPlayer
          ? `<span class="ticket-avatar">${initials(name)}</span>`
          : `<span class="ticket-avatar"><img src="/img/logo.jpg" alt=""></span>`;
        const text = formatText(message.content);
        return `
        <article class="ticket-msg ticket-msg-${isPlayer ? "player" : "staff"}">
          ${avatar}
          <div class="ticket-bubble">
            <p><strong>${escapeHtml(name)}</strong> <span class="muted">${when(message.createdAt)}</span></p>
            ${text ? `<p>${text}</p>` : ""}
            ${mediaHTML(message)}
          </div>
        </article>`;
      })
      .join("");
    $("#threadMessages").scrollTop = $("#threadMessages").scrollHeight;
  }

  async function openTicket(id, { silent = false } = {}) {
    const ticket = tickets.find((item) => item.id === id);
    if (!ticket) return;
    currentId = id;
    if (!silent) {
      const params = new URLSearchParams(location.search);
      params.set("id", id);
      history.replaceState({}, "", `${location.pathname}?${params}`);
      renderList();
    }
    try {
      const key = ticket.key || ticketKey(id);
      const data = await api(`/api/tickets/${id}?key=${encodeURIComponent(key)}`);
      remember(data.ticket);
      const index = tickets.findIndex((item) => item.id === id);
      if (index >= 0) tickets[index] = { ...tickets[index], ...data.ticket };
      if (!silent) renderList();
      renderThread(data.ticket);
    } catch (err) {
      if (/introuvable/i.test(err.message)) {
        forget(id);
        tickets = tickets.filter((item) => item.id !== id);
        if (currentId === id) resetOpening();
        else renderList();
        return;
      }
      $("#replyError").textContent = err.message;
    }
  }

  async function init() {
    if (window.Staff) {
      await window.Staff.load();
      window.Staff.renderAuth($("#authArea"));
      staff = window.Staff.can("tickets");
    }
    const saved = savedKeys();
    for (const item of saved) {
      try {
        await api(`/api/tickets/${item.id}?key=${encodeURIComponent(item.key)}`);
      } catch {
        forget(item.id);
      }
    }
    let data = { items: [], categories: [] };
    try {
      data = await api("/api/tickets");
    } catch {
      data = { items: [], categories: [] };
    }
    tickets = data.items || [];
    categories = data.categories || [];
    staff = Boolean(data.staff);
    renderCategories();
    const wanted = new URLSearchParams(location.search).get("id") || tickets[0]?.id || "";
    renderList();
    if (wanted) openTicket(wanted);
    else renderThread(null);
  }

  $("#ticketList").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-id]");
    if (btn) openTicket(btn.dataset.id);
  });

  $("#ticketCategories").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cat]");
    if (!btn) return;
    selectedCat = btn.dataset.cat;
    renderCategories();
  });

  $("#ticketForm").onsubmit = async (event) => {
    event.preventDefault();
    const error = $("#ticketError");
    error.textContent = "";
    const form = event.target;
    if (!selectedCat) {
      error.textContent = "Choisis une catégorie.";
      return;
    }
    try {
      const data = await api("/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.value.trim(),
          category: selectedCat,
          subject: form.subject.value.trim(),
          content: form.content.value.trim(),
          image: form.image.value.trim(),
          link: form.link.value.trim(),
        }),
      });
      remember(data.ticket);
      form.reset();
      selectedCat = "";
      renderCategories();
      tickets = [data.ticket, ...tickets.filter((item) => item.id !== data.ticket.id)];
      openTicket(data.ticket.id);
      renderList();
      if (data.discordError) {
        error.textContent = `Ticket ouvert ici, mais Discord a refusé : ${data.discordError}`;
      }
    } catch (err) {
      error.textContent = err.message;
    }
  };

  $("#replyForm").onsubmit = async (event) => {
    event.preventDefault();
    $("#replyError").textContent = "";
    const content = event.target.content.value.trim();
    const image = event.target.image.value.trim();
    const link = event.target.link.value.trim();
    if (!currentId || (!content && !image && !link)) return;
    try {
      const data = await api(`/api/tickets/${currentId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, image, link, key: ticketKey(currentId) }),
      });
      event.target.reset();
      const index = tickets.findIndex((item) => item.id === currentId);
      if (index >= 0) tickets[index] = { ...tickets[index], ...data.ticket };
      renderThread(data.ticket);
    } catch (err) {
      $("#replyError").textContent = err.message;
    }
  };

  $("#closeTicket").onclick = async () => {
    if (!currentId) return;
    $("#replyError").textContent = "";
    const id = currentId;
    try {
      await api(`/api/tickets/${id}/close`, {
        method: "POST",
        body: JSON.stringify({ key: ticketKey(id) }),
      });
      forget(id);
      tickets = tickets.filter((item) => item.id !== id);
      resetOpening();
    } catch (err) {
      $("#replyError").textContent = err.message;
    }
  };

  setInterval(() => {
    if (currentId && !document.hidden) openTicket(currentId, { silent: true });
  }, 2500);

  init();
})();
