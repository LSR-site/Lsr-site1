import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

// ---------- Stockage Supabase (une table site_data : clé -> JSON) ----------
async function supabase(path, options = {}) {
  // On garde seulement https://xxxx.supabase.co, même si l'adresse collée contient /rest/v1 ou autre chose
  const raw = env("SUPABASE_URL");
  const ref = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/)?.[1];
  const base = ref ? `https://${ref}.supabase.co` : /^https?:\/\//.test(raw) ? new URL(raw).origin : `https://${raw.split("/")[0]}`;
  const url = `${base}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { apikey: env("SUPABASE_SECRET_KEY"), "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} : ${await res.text()}`);
  return res.status === 204 || res.status === 201 ? null : res.json();
}
// Chaque lecture garde la version (updated_at) : si le bot a écrit entre-temps, l'écriture est refusée au lieu d'écraser
const versions = new WeakMap();
async function readRow(name) {
  return (await supabase(`site_data?key=eq.${name}&select=value,updated_at`))[0] || null;
}
const readJson = async (name, fallback) => (await readRow(name))?.value ?? fallback;
async function writeJson(name, value) {
  const version = versions.get(value);
  if (version) {
    const done = await supabase(`site_data?key=eq.${name}&updated_at=eq.${encodeURIComponent(version)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ value, updated_at: now() }),
    });
    if (!done?.length) {
      const err = new Error("Quelqu’un vient de modifier en même temps. Réessaie.");
      err.status = 409;
      throw err;
    }
    versions.set(value, done[0].updated_at);
    return value;
  }
  await supabase("site_data", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: name, value, updated_at: now() }) });
  return value;
}
const readList = async (name) => {
  const row = await readRow(name);
  const raw = row?.value || {};
  const list = { ...raw, nextNumber: Number(raw.nextNumber) || 1, items: Array.isArray(raw.items) ? raw.items : [] };
  if (row) versions.set(list, row.updated_at);
  return list;
};

// Lire → modifier → écrire, en recommençant si le bot a écrit au même moment
async function updateList(name, change) {
  for (let i = 0; ; i++) {
    const data = await readList(name);
    const result = change(data);
    try {
      await writeJson(name, data);
      return result;
    } catch (err) {
      if (err.status !== 409 || i >= 6) throw err;
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
    }
  }
}

const env = (key) => String(process.env[key] || "").trim();
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const newKey = () => crypto.randomBytes(16).toString("hex");
const httpsUrl = (url) => (/^https:\/\//i.test(String(url || "").trim()) ? String(url).trim().slice(0, 500) : "");
const text = (value, max) => String(value || "").trim().slice(0, max);
const byNumberDesc = (a, b) => Number(b.number) - Number(a.number);

// ---------- Config ----------

const ALL_PERMS = ["site", "reglement", "team", "tickets"];
const STAFF_GRADES = [
  ["fondateur", "Fondateur", "FONDATEUR", ["all"]],
  ["fondatrice", "Fondatrice", "FONDATRICE", ["all"]],
  ["admin", "Administrateur", "ADMIN", ["tickets"]],
  ["modo", "Modérateur", "MODO", ["tickets"]],
  ["helper", "Helper", "HELPER", ["tickets"]],
].map(([id, label, key, perms]) => ({ id, label, envKey: `STAFF_PASSWORD_${key}`, perms }));

const sub = (pairs) => pairs.map(([id, label]) => ({ id, label }));
const RULE_TREE = [
  { id: "general", label: "Général", subs: sub([["intro", "Présentation"], ["base", "Règles de base"], ["fairplay", "Fair-play"]]) },
  { id: "rp", label: "RP & Vocal", subs: sub([["vocal", "Vocal"], ["identite", "Identité & lore"], ["fear", "Fear RP & NLR"]]) },
  { id: "illegal", label: "Illégal", subs: sub([["general-illegal", "Règles illégales"], ["orgas", "Organisations"], ["braquages", "Braquages"], ["guerres", "Guerres & otages"], ["armes", "Armes"]]) },
  { id: "legal", label: "Légal", subs: sub([["services", "Services publics"], ["gouvernement", "Gouvernement"], ["justice", "Justice & DOJ"], ["ems", "EMS"], ["police", "Police"]]) },
  { id: "boutique", label: "Boutique", subs: sub([["vehicules", "Véhicules"], ["vip", "VIP"], ["maisons", "Maisons"]]) },
  { id: "discord", label: "Discord", subs: sub([["salons", "Salons"], ["vocal-discord", "Vocal Discord"]]) },
  { id: "staff", label: "Staff", subs: sub([["sanctions", "Sanctions"], ["tickets-staff", "Tickets"]]) },
].map((cat) => ({ ...cat, subs: [...cat.subs, { id: "autre", label: "Autre" }] }));

const TICKET_CATEGORIES = [
  ["support", "general", "🛠️", "Support", "Besoin d'aide ou petit problème IG"],
  ["entreprise", "general", "🏛️", "Demande Entreprise", "Projet ou reprise d'entreprise"],
  ["scene", "general", "⚖️", "Problème Scène", "Signaler un problème lié à une scène"],
  ["illegal", "general", "🔫", "Demande Illégal", "Projet ou reprise de groupe illégal"],
  ["candidature", "general", "👮", "Candidature Staff", "Rejoindre l'équipe Los Santos Reborn"],
  ["mort-rp", "general", "💀", "Demande Mort RP", "Déposer un dossier Mort RP"],
  ["deban", "general", "🔒", "Demande Déban", "Faire une demande de déban"],
  ["direction", "general", "📞", "Contact Direction", "Contacter directement la direction"],
  ["vehicule", "boutique", "🚗", "Véhicule boutique", "Question ou demande liée à un véhicule boutique"],
  ["vip", "boutique", "⭐", "VIP", "Question ou demande liée au statut VIP"],
  ["donation", "boutique", "💎", "Donation", "Question concernant une donation ou un soutien"],
  ["autre", "boutique", "📦", "Autre demande", "Toute autre demande liée à la boutique"],
].map(([id, group, icon, label, hint]) => ({ id, group, icon, label, hint }));
const ticketLabel = (id) => TICKET_CATEGORIES.find((c) => c.id === id)?.label || "Autre demande";

// ---------- Staff ----------
const findGrade = (id) => STAFF_GRADES.find((g) => g.id === id) || null;
const getGrade = (req) => (req.session.staffGrade ? findGrade(req.session.staffGrade) : req.session.staff ? findGrade("fondateur") : null);
const permsOf = (grade) => (!grade ? [] : grade.perms.includes("all") ? ["all", ...ALL_PERMS] : grade.perms);
const can = (req, perm) => permsOf(getGrade(req)).some((p) => p === "all" || p === perm);
const staffName = (req) => getGrade(req)?.label || "Staff";
const same = (a, b) => Boolean(b) && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function requirePerm(req, res, perm) {
  if (can(req, perm)) return true;
  res.status(403).json({ error: req.session.staff ? "Ton grade staff ne permet pas cette action." : "Réservé au staff. Connecte-toi pour modifier." });
  return false;
}

function publicUser(req) {
  const grade = getGrade(req);
  if (!req.session.staff) return { connected: false, isStaff: false, canEdit: false };
  const perms = permsOf(grade);
  return {
    connected: true,
    isStaff: true,
    canEdit: perms.includes("all") || perms.some((p) => p !== "tickets"),
    username: grade?.label || "Staff",
    grade: grade?.id || null,
    gradeLabel: grade?.label || "Staff",
    perms,
  };
}

// ---------- Règlement ----------
function normalizeSection(section, index) {
  const cat = RULE_TREE.find((c) => c.id === section.category) || RULE_TREE[0];
  return {
    id: String(section.id || uid()),
    category: cat.id,
    subcategory: cat.subs.some((s) => s.id === section.subcategory) ? section.subcategory : "autre",
    title: String(section.title || `Section ${index + 1}`).slice(0, 140),
    content: String(section.content || "").slice(0, 20000),
  };
}

async function readRules() {
  const raw = await readJson("reglement", {});
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return { updatedAt: raw.updatedAt || null, updatedBy: raw.updatedBy || null, categories: RULE_TREE, sections: sections.map(normalizeSection) };
}

const saveRules = (sections, by) =>
  writeJson("reglement", { updatedAt: now(), updatedBy: by || "Staff", sections: sections.slice(0, 50).map(normalizeSection) });

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

const ruleActions = {
  section(body, rules) {
    const incoming = normalizeSection(body, rules.sections.length);
    const i = rules.sections.findIndex((s) => s.id === incoming.id);
    if (i === -1 && rules.sections.length >= 50) fail(400, "Nombre maximum de sections atteint.");
    i === -1 ? rules.sections.push(incoming) : (rules.sections[i] = incoming);
  },
  delete(body, rules) {
    const before = rules.sections.length;
    rules.sections = rules.sections.filter((s) => s.id !== String(body.id || ""));
    if (rules.sections.length === before) fail(404, "Section introuvable.");
  },
  move(body, rules) {
    const list = rules.sections;
    const from = list.findIndex((s) => s.id === String(body.id || ""));
    if (from === -1) fail(404, "Section introuvable.");
    const group = list.map((s, i) => ({ s, i })).filter(({ s }) => s.category === list[from].category && s.subcategory === list[from].subcategory);
    const pos = group.findIndex(({ i }) => i === from) + (body.direction === "up" ? -1 : 1);
    if (pos < 0 || pos >= group.length) return false;
    const to = group[pos].i;
    [list[from], list[to]] = [list[to], list[from]];
  },
};

// ---------- Accueil ----------
async function readHome() {
  const raw = await readJson("home", {});
  return { levels: Array.isArray(raw.levels) ? raw.levels : [], team: Array.isArray(raw.team) ? raw.team : [] };
}

// Organigramme libre : niveaux et rôles nommés par le fondateur
function writeHome({ levels, team }) {
  const lv = (levels || []).slice(0, 12).map((l) => ({
    id: String(l.id || uid()).slice(0, 60),
    name: text(l.name, 40) || "Niveau",
    roleId: isSnowflake(String(l.roleId || "")) ? String(l.roleId) : "",
  }));
  return writeJson("home", {
    levels: lv,
    team: (team || []).slice(0, 40).map((m) => ({
      id: String(m.id || uid()).slice(0, 60),
      name: text(m.name, 40) || "Membre",
      role: text(m.role, 40),
      level: lv.some((l) => l.id === m.level) ? m.level : lv[0]?.id || "",
      bio: text(m.bio, 280),
    })),
  });
}

// ---------- Clés joueur (tickets / WL retenus dans la session) ----------
function remember(req, bag, item, max) {
  const list = Array.isArray(req.session[bag]) ? req.session[bag] : [];
  if (!list.some((e) => e.id === item.id)) req.session[bag] = [...list, { id: item.id, key: item.key }].slice(-max);
}
const owns = (req, bag, item) => (req.session[bag] || []).some((e) => e.id === item.id && e.key === item.key);

// ---------- Discord : c'est le bot qui agit ----------
// Le site n'appelle jamais Discord (les hébergeurs partagés comme Render se font bloquer).
// Il dépose des demandes dans Supabase (clé "discord_jobs") et le bot les exécute.
const isSnowflake = (id) => /^\d{15,25}$/.test(id);
const queueJob = (job) => updateList("discord_jobs", (data) => {
  data.items.push({ id: uid(), createdAt: now(), ...job });
});
// Rôles et membres Discord, recopiés par le bot toutes les quelques minutes
const discordCache = () => readJson("discord_cache", { roles: [], members: [] });
// Le bot écrit un signal de vie chaque minute : sans signal depuis 3 min, on prévient le staff
async function botStatus() {
  const status = await readJson("bot_status", null);
  const online = Boolean(status?.at && Date.now() - Date.parse(status.at) < 3 * 60 * 1000);
  if (!status) return "Le bot Discord n’est pas relié au site : les salons de tickets, rôles WL et annonces ne partiront pas. Mets le nouvel index.js sur ton hébergeur et redémarre le bot.";
  if (!online) return "Le bot Discord ne répond plus depuis plusieurs minutes : vérifie qu’il est allumé.";
  if (!status.wlRole) return "Le bot fonctionne, mais WL_ROLE_ID est vide dans son .env : le rôle WL ne sera pas donné.";
  return "";
}

// ---------- Tickets ----------
const publicTicket = (t, includeKey) => ({
  id: t.id, number: t.number, status: t.status, category: t.category, categoryLabel: ticketLabel(t.category),
  subject: t.subject, authorName: t.authorName, createdAt: t.createdAt,
  messages: (t.messages || []).map((m) => (m.from === "player" ? m : { ...m, from: "staff", author: "Staff" })),
  key: includeKey ? t.key : undefined,
});

async function findTicket(req, res, key) {
  const data = await readList("tickets");
  const ticket = data.items.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket introuvable." }) && null;
  const given = String(key || "");
  if (!can(req, "tickets") && !(given && same(given, ticket.key)) && !owns(req, "ticketKeys", ticket)) {
    return res.status(403).json({ error: "Ce ticket ne t’appartient pas." }) && null;
  }
  return { data, ticket };
}

const message = (from, author, body) => ({
  id: uid(), from, author, content: text(body.content, 1800), image: httpsUrl(body.image), link: httpsUrl(body.link), createdAt: now(), discordId: "",
});

// ---------- Whitelist & casiers ----------
const WL_FIELDS = ["id", "number", "status", "discord", "age", "name", "story", "experience", "motivation", "mic", "createdAt"];
const WL_EXTRA = { casierAt: null, casierBy: "", casierNote: "", vocalAt: null, vocalBy: "", vocalNote: "", decidedAt: null, decidedBy: "", staffNote: "" };
function publicWhitelist(item, { includeKey = false, staff = false } = {}) {
  const out = Object.fromEntries(WL_FIELDS.map((k) => [k, item[k]]));
  for (const [k, fallback] of Object.entries(WL_EXTRA)) out[k] = item[k] || fallback;
  out.casierId = staff ? item.casierId || null : undefined;
  out.key = includeKey ? item.key : undefined;
  return out;
}

const discordId = (v) => String(v || "").trim().toLowerCase();

function addNote(casier, { kind, text: body, by }) {
  const note = {
    id: uid(),
    kind: ["comment", "concern", "sanction", "vocal", "system"].includes(kind) ? kind : "comment",
    text: text(body, 2000),
    createdAt: now(),
    createdBy: by || "Staff",
  };
  if (!note.text) return null;
  casier.notes = [note, ...(Array.isArray(casier.notes) ? casier.notes : [])];
  casier.updatedAt = note.createdAt;
  return note;
}

function linkCasier(data, item, by, note) {
  let casier = data.items.find((c) => discordId(c.discord) === discordId(item.discord));
  if (!casier) {
    casier = { id: uid(), number: data.nextNumber++, discord: String(item.discord || "").trim(), name: item.name, age: item.age, mic: item.mic, whitelistIds: [], openedAt: now(), openedBy: by || item.casierBy || "Staff", updatedAt: now(), notes: [] };
    data.items.unshift(casier);
    addNote(casier, { kind: "system", text: `Casier ouvert pour ${item.name} (demande WL #${item.number}).`, by: casier.openedBy });
  }
  Object.assign(casier, { name: item.name || casier.name, age: item.age || casier.age, mic: item.mic || casier.mic, discord: String(item.discord || casier.discord).trim() });
  casier.whitelistIds = Array.isArray(casier.whitelistIds) ? casier.whitelistIds : [];
  if (!casier.whitelistIds.includes(item.id)) casier.whitelistIds.unshift(item.id);
  if (note) addNote(casier, note);
  item.casierId = casier.id;
  return casier;
}

// Crée les casiers manquants pour les WL au statut "casier"
async function syncCasiers(wl) {
  wl = wl || (await readList("whitelist"));
  const data = await readList("casiers");
  const missing = wl.items.filter((i) => i.status === "casier" && !(i.casierId && data.items.some((c) => c.id === i.casierId)));
  for (const item of missing) {
    const by = item.casierBy || "Staff";
    linkCasier(data, item, by, item.casierNote ? { kind: "comment", text: item.casierNote, by } : null);
  }
  if (missing.length) await Promise.all([writeJson("casiers", data), writeJson("whitelist", wl)]);
  return data;
}

function publicCasier(casier, wlItem) {
  const notes = Array.isArray(casier.notes) ? casier.notes : [];
  const count = (kind) => notes.filter((n) => n.kind === kind).length;
  const last = notes[0];
  return {
    ...Object.fromEntries(["id", "number", "discord", "name", "age", "mic", "openedAt", "openedBy", "updatedAt"].map((k) => [k, casier[k]])),
    noteCount: notes.length,
    sanctionCount: count("sanction"),
    concernCount: count("concern"),
    lastNote: last ? { kind: last.kind, text: last.text, createdAt: last.createdAt, createdBy: last.createdBy } : null,
    notes,
    whitelist: wlItem ? publicWhitelist(wlItem, { staff: true }) : null,
  };
}

async function casierView(casier, wl) {
  wl = wl || (await readList("whitelist"));
  const item = (casier.whitelistIds || []).map((id) => wl.items.find((i) => i.id === id)).find(Boolean) || null;
  return publicCasier(casier, item);
}

// ---------- Session : cookie signé (pas de mémoire serveur sur Vercel) ----------
const sign = (data) => crypto.createHmac("sha256", env("SESSION_SECRET") || "dev").update(data).digest("base64url");
function sessions(req, res, next) {
  const raw = (req.headers.cookie || "").match(/(?:^|;\s*)lsr=([^;]+)/)?.[1] || "";
  const [data, sig] = raw.split(".");
  try {
    req.session = data && sig === sign(data) ? JSON.parse(Buffer.from(data, "base64url").toString()) : {};
  } catch {
    req.session = {};
  }
  const before = JSON.stringify(req.session);
  const json = res.json.bind(res);
  res.json = (body) => {
    const after = JSON.stringify(req.session);
    if (after !== before) {
      const value = Buffer.from(after).toString("base64url");
      res.setHeader("Set-Cookie", `lsr=${value}.${sign(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${req.secure ? "; Secure" : ""}`);
    }
    return json(body);
  };
  next();
}

// ---------- Application ----------
const app = express();
// Les erreurs des routes async vont au gestionnaire d'erreurs au lieu de bloquer la requête
for (const method of ["get", "post"]) {
  const original = app[method].bind(app);
  app[method] = (path, ...handlers) =>
    handlers.length ? original(path, ...handlers.map((h) => (req, res, next) => Promise.resolve(h(req, res, next)).catch(next))) : original(path);
}
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(sessions);

// Staff
app.get("/api/me", (req, res) => res.json(publicUser(req)));

app.post("/api/staff/login", (req, res) => {
  const grade = findGrade(String(req.body?.grade || ""));
  if (!grade) return res.status(400).json({ error: "Choisis un grade : Helper, Modérateur, Administrateur ou Fondateur." });
  const given = String(req.body?.password || "");
  const ok = given && (same(given, env(grade.envKey)) || (grade.id === "fondateur" && same(given, env("STAFF_PASSWORD"))));
  if (!ok) return res.status(401).json({ error: "Mot de passe staff incorrect pour ce grade." });
  Object.assign(req.session, { staff: true, staffGrade: grade.id });
  res.json(publicUser(req));
});

app.post("/api/staff/logout", (req, res) => {
  Object.assign(req.session, { staff: false, staffGrade: null });
  res.json(publicUser(req));
});

// Règlement
app.get("/api/reglement", async (_req, res) => res.json(await readRules()));

app.post(["/api/reglement/section", "/api/reglement/section/:action"], async (req, res) => {
  if (!requirePerm(req, res, "reglement")) return;
  const action = ruleActions[req.params.action || "section"];
  if (!action) return res.status(404).json({ error: "Action inconnue." });
  try {
    const rules = await readRules();
    if (action(req.body || {}, rules) === false) return res.json(rules);
    res.json(await saveRules(rules.sections, staffName(req)));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Accueil
app.get("/api/home", async (_req, res) => res.json(await readHome()));

app.post("/api/home", async (req, res) => {
  if (!requirePerm(req, res, "team")) return;
  const current = await readHome();
  res.json(await writeHome({ levels: req.body?.levels ?? current.levels, team: req.body?.team ?? current.team }));
});

// Équipe ↔ rôles Discord (copie faite par le bot)
app.get("/api/discord/roles", async (req, res) => {
  if (!requirePerm(req, res, "team")) return;
  res.json({ roles: (await discordCache()).roles || [] });
});

app.post("/api/home/sync", async (req, res) => {
  if (!requirePerm(req, res, "team")) return;
  const home = await readHome();
  const linked = home.levels.filter((l) => l.roleId);
  if (!linked.length) return res.status(400).json({ error: "Relie d’abord un niveau à un rôle Discord, puis enregistre." });
  const { roles = [], members = [] } = await discordCache();
  if (!members.length) return res.status(400).json({ error: "Le bot n’a pas encore envoyé la liste des membres Discord. Vérifie qu’il est allumé." });
  const old = new Map(home.team.map((m) => [m.id, m]));
  const synced = linked.flatMap((level) =>
    members
      .filter((m) => m.roles.includes(level.roleId))
      .map((m) => {
        const id = `d-${m.id}`;
        return { id, name: m.name, role: old.get(id)?.role || roles.find((r) => r.id === level.roleId)?.name || "", level: level.id, bio: old.get(id)?.bio || "" };
      })
  );
  const kept = home.team.filter((m) => !linked.some((l) => l.id === m.level));
  res.json(await writeHome({ levels: home.levels, team: [...kept, ...synced] }));
});

// Annonce : le bot la publie dans le salon des annonces
app.post("/api/discord/annonce", async (req, res) => {
  if (!requirePerm(req, res, "site")) return;
  const title = text(req.body?.title, 200);
  const body = text(req.body?.text, 4000);
  if (!title || !body) return res.status(400).json({ error: "Mets un titre et un texte." });
  const ping = ["everyone", "role", "none"].includes(req.body?.ping) ? req.body.ping : "none";
  await queueJob({ type: "annonce", title, text: body, image: httpsUrl(req.body?.image), ping, by: staffName(req) });
  res.json({ ok: true });
});

// Textes du site (mode édition fondateur)
const DISCORD_DEFAULT = "https://discord.gg/bNDKVDSaz";
const readSite = async () => ({ texts: {}, discord: DISCORD_DEFAULT, ...(await readJson("site", {})) });

app.post("/api/site", async (req, res) => {
  if (!requirePerm(req, res, "site")) return;
  const site = await readSite();
  for (const [key, value] of Object.entries(req.body?.texts || {})) {
    if (/^[\w.-]{1,60}$/.test(key)) site.texts[key] = text(value, 600);
  }
  if (req.body?.discord !== undefined) {
    const url = httpsUrl(req.body.discord);
    if (!url) return res.status(400).json({ error: "Le lien Discord doit commencer par https://" });
    site.discord = url;
  }
  res.json(await writeJson("site", site));
});

// Tickets
app.get("/api/tickets", async (req, res) => {
  const staff = can(req, "tickets");
  const items = (await readList("tickets")).items.filter((t) => staff || owns(req, "ticketKeys", t));
  res.json({
    staff,
    botWarning: staff ? await botStatus() : "",
    categories: TICKET_CATEGORIES,
    items: items.sort(byNumberDesc).map((t) => publicTicket(t, !staff)),
  });
});

app.post("/api/tickets", async (req, res) => {
  const body = req.body || {};
  const name = text(body.name, 40);
  const category = TICKET_CATEGORIES.some((c) => c.id === body.category) ? body.category : "";
  const subject = text(body.subject, 120);
  const first = message("player", name, body);
  if (name.length < 2) return res.status(400).json({ error: "Indique ton nom RP." });
  if (!category) return res.status(400).json({ error: "Choisis une catégorie." });
  if (subject.length < 3) return res.status(400).json({ error: "Indique le sujet du ticket." });
  if (first.content.length < 3 && !first.image) return res.status(400).json({ error: "Explique ta demande ou ajoute une photo." });
  const data = await readList("tickets");
  const open = data.items.filter((t) => t.status === "open" && owns(req, "ticketKeys", t)).length;
  if (open >= 5) return res.status(429).json({ error: "Tu as déjà trop de tickets ouverts. Attends une réponse staff." });

  // Le bot crée le salon Discord dans quelques secondes (needsChannel)
  const ticket = { id: uid(), number: data.nextNumber, key: newKey(), status: "open", category, subject, authorName: name, channelId: "", needsChannel: true, createdAt: first.createdAt, closedAt: null, messages: [first] };
  await updateList("tickets", (latest) => {
    if (latest.items.some((t) => t.number === ticket.number)) ticket.number = latest.nextNumber;
    latest.nextNumber = ticket.number + 1;
    latest.items = [ticket, ...latest.items].slice(0, 400);
  });
  remember(req, "ticketKeys", ticket, 20);
  res.json({ ticket: publicTicket(ticket, true) });
});

app.get("/api/tickets/:id", async (req, res) => {
  const found = await findTicket(req, res, req.query.key);
  if (!found) return;
  const { ticket } = found;
  remember(req, "ticketKeys", ticket, 20);
  res.json({ ticket: publicTicket(ticket, !can(req, "tickets")) });
});

app.post("/api/tickets/:id/messages", async (req, res) => {
  const found = await findTicket(req, res, req.body?.key);
  if (!found) return;
  const { ticket } = found;
  if (ticket.status !== "open") return res.status(400).json({ error: "Ce ticket est fermé." });
  const staff = can(req, "tickets");
  const msg = message(staff ? "staff" : "player", staff ? "Staff" : ticket.authorName, req.body || {});
  if (!msg.content && !msg.image && !msg.link) return res.status(400).json({ error: "Écris un message, un lien ou une photo." });
  msg.pending = true; // le bot le poste sur Discord
  const saved = await updateList("tickets", (latest) => {
    const t = latest.items.find((x) => x.id === ticket.id);
    if (t) t.messages = [...(t.messages || []), msg];
    return t || { ...ticket, messages: [...ticket.messages, msg] };
  });
  res.json({ ticket: publicTicket(saved, !staff) });
});

app.post("/api/tickets/:id/close", async (req, res) => {
  const found = await findTicket(req, res, req.body?.key);
  if (!found) return;
  const { ticket } = found;
  await updateList("tickets", (latest) => {
    latest.items = latest.items.filter((t) => t.id !== ticket.id);
    if (ticket.channelId) latest.deleteChannels = [...(latest.deleteChannels || []), ticket.channelId]; // le bot supprime le salon
  });
  req.session.ticketKeys = (req.session.ticketKeys || []).filter((e) => e.id !== ticket.id);
  res.json({ deleted: true, id: ticket.id });
});

// Whitelist
app.get("/api/whitelist", async (req, res) => {
  const staff = can(req, "tickets");
  const items = (await readList("whitelist")).items.filter((i) => staff || owns(req, "whitelistKeys", i));
  res.json({ staff, botWarning: staff ? await botStatus() : "", items: items.sort(byNumberDesc).map((i) => publicWhitelist(i, { includeKey: !staff, staff })) });
});

app.post("/api/whitelist", async (req, res) => {
  const b = req.body || {};
  const item = {
    discord: text(b.discord, 40), age: Number(b.age), name: text(b.name, 40), story: text(b.story, 4000),
    experience: text(b.experience, 1500), motivation: text(b.motivation, 1200), mic: b.mic === "non" ? "non" : "oui",
  };
  const error =
    (item.discord.length < 2 && "Indique ton Discord.") ||
    ((!Number.isInteger(item.age) || item.age < 16 || item.age > 80) && "L’âge minimum pour postuler est 16 ans.") ||
    (item.name.length < 3 && "Indique ton nom RP.") ||
    (item.story.length < 80 && "Développe l’histoire de ton personnage (80 caractères min.).") ||
    (item.experience.length < 10 && "Indique ton expérience RP.") ||
    (item.motivation.length < 10 && "Explique pourquoi tu veux rejoindre le serveur.") ||
    (!b.rules && "Tu dois confirmer avoir lu le règlement.");
  if (error) return res.status(400).json({ error });
  const data = await readList("whitelist");
  if (data.items.some((i) => (i.status === "pending" || i.status === "casier") && (req.session.whitelistKeys || []).some((e) => e.id === i.id))) {
    return res.status(429).json({ error: "Tu as déjà une demande ou un casier ouvert. Attends le vocal et la décision." });
  }
  Object.assign(item, { id: uid(), number: data.nextNumber++, key: newKey(), status: "pending", createdAt: now(), casierId: null, ...WL_EXTRA });
  data.items.unshift(item);
  await writeJson("whitelist", data);
  remember(req, "whitelistKeys", item, 10);
  res.json({ item: publicWhitelist(item, { includeKey: true }) });
});

async function staffWhitelist(req, res) {
  if (!requirePerm(req, res, "tickets")) return null;
  const data = await readList("whitelist");
  const item = data.items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Demande introuvable." }) && null;
  return { data, item };
}

app.post("/api/whitelist/:id/casier", async (req, res) => {
  const found = await staffWhitelist(req, res);
  if (!found) return;
  const { data, item } = found;
  if (item.status !== "pending") return res.status(400).json({ error: "Un casier existe déjà pour ce joueur." });
  const other = data.items.find((i) => i.id !== item.id && discordId(i.discord) === discordId(item.discord) && ["casier", "pending"].includes(i.status));
  if (other) return res.status(400).json({ error: `Ce Discord a déjà le dossier #${other.number} ouvert. Ferme-le avant d’en créer un autre.` });
  const casiers = await syncCasiers(data);
  Object.assign(item, { status: "casier", casierNote: text(req.body?.casierNote, 800), casierAt: now(), casierBy: staffName(req) });
  const casier = linkCasier(casiers, item, item.casierBy, item.casierNote ? { kind: "comment", text: item.casierNote, by: item.casierBy } : null);
  await Promise.all([writeJson("casiers", casiers), writeJson("whitelist", data)]);
  res.json({ item: publicWhitelist(item, { staff: true }), casier: publicCasier(casier, item) });
});

app.post("/api/whitelist/:id/status", async (req, res) => {
  if (!requirePerm(req, res, "tickets")) return;
  const status = ["accepted", "refused"].includes(req.body?.status) ? req.body.status : "";
  if (!status) return res.status(400).json({ error: "Choisis accepter ou refuser." });
  const found = await staffWhitelist(req, res);
  if (!found) return;
  const { data, item } = found;
  if (item.status === "pending") return res.status(400).json({ error: "Ouvre d’abord le casier, puis décide après le vocal." });
  if (item.status !== "casier") return res.status(400).json({ error: "Cette demande a déjà une décision." });
  const vocalNote = text(req.body?.vocalNote, 800);
  if (vocalNote.length < 8) return res.status(400).json({ error: "Indique le compte-rendu du vocal avant d’accepter ou de refuser." });
  const by = staffName(req);
  Object.assign(item, { vocalNote, vocalAt: now(), vocalBy: by, status, staffNote: text(req.body?.staffNote, 500), decidedAt: now(), decidedBy: by });
  const casiers = await syncCasiers(data);
  const casier = linkCasier(casiers, item, by, { kind: "vocal", text: vocalNote, by });
  addNote(casier, { kind: "system", text: `WL #${item.number} ${status === "accepted" ? "acceptée" : "refusée"} après vocal.`, by });
  if (item.staffNote) addNote(casier, { kind: "comment", text: `Message joueur : ${item.staffNote}`, by });
  await Promise.all([writeJson("casiers", casiers), writeJson("whitelist", data)]);
  // Le bot donne le rôle WL (si acceptée), envoie le MP et note le résultat dans le casier
  await queueJob({ type: "whitelist", status, discord: item.discord, number: item.number, name: item.name, staffNote: item.staffNote, casierId: casier.id });
  res.json({ item: publicWhitelist(item, { staff: true }), casier: publicCasier(casier, item) });
});

// Casiers
app.get("/api/casiers", async (req, res) => {
  if (!requirePerm(req, res, "tickets")) return;
  const wl = await readList("whitelist");
  const items = (await syncCasiers(wl)).items.sort(byNumberDesc);
  res.json({ items: await Promise.all(items.map((c) => casierView(c, wl))) });
});

async function staffCasier(req, res) {
  if (!requirePerm(req, res, "tickets")) return null;
  const data = await syncCasiers();
  const casier = data.items.find((c) => c.id === req.params.id);
  if (!casier) return res.status(404).json({ error: "Casier introuvable." }) && null;
  return { data, casier };
}

app.get("/api/casiers/:id", async (req, res) => {
  const found = await staffCasier(req, res);
  if (found) res.json({ casier: await casierView(found.casier) });
});

app.post("/api/casiers/:id/notes", async (req, res) => {
  if (!requirePerm(req, res, "tickets")) return;
  const kind = String(req.body?.kind || "comment");
  if (!["comment", "concern", "sanction"].includes(kind)) return res.status(400).json({ error: "Choisis un commentaire, un point dérangeant ou une sanction." });
  if (text(req.body?.text, 2000).length < 3) return res.status(400).json({ error: "Écris au moins quelques mots." });
  const found = await staffCasier(req, res);
  if (!found) return;
  addNote(found.casier, { kind, text: req.body.text, by: staffName(req) });
  await writeJson("casiers", found.data);
  res.json({ casier: await casierView(found.casier) });
});

app.post("/api/casiers/:id/delete", async (req, res) => {
  const found = await staffCasier(req, res);
  if (!found) return;
  const { data, casier } = found;
  const wl = await readList("whitelist");
  for (const item of wl.items) {
    if (item.casierId !== casier.id && !(casier.whitelistIds || []).includes(item.id)) continue;
    item.casierId = null;
    if (item.status === "casier") Object.assign(item, { status: "pending", casierAt: null, casierBy: "", casierNote: "" });
  }
  data.items = data.items.filter((c) => c.id !== casier.id);
  await Promise.all([writeJson("casiers", data), writeJson("whitelist", wl)]);
  res.json({ ok: true, id: casier.id });
});

// ---------- Pages (même en-tête pour toutes) ----------
// Chemins écrits en entier pour que Vercel embarque bien ces fichiers
const read = (url) => fs.readFileSync(url, "utf8");
const HTML = {
  layout: read(new URL("./pages/_layout.html", import.meta.url)),
  index: read(new URL("./pages/index.html", import.meta.url)),
  tickets: read(new URL("./pages/tickets.html", import.meta.url)),
  whitelist: read(new URL("./pages/whitelist.html", import.meta.url)),
  casiers: read(new URL("./pages/casiers.html", import.meta.url)),
  reglement: read(new URL("./pages/reglement.html", import.meta.url)),
};
const FONTS = "family=Cinzel:wght@600;700&family=Outfit";
const PAGES = {
  "/": { file: "index", title: "Los Santos Reborn", body: "home-body", js: ["home"] },
  "/tickets": { file: "tickets", title: "Tickets", js: ["tickets"] },
  "/whitelist": { file: "whitelist", title: "Whitelist", js: ["casier-window", "whitelist"] },
  "/casiers": { file: "casiers", title: "Casiers", js: ["casier-window", "casiers"] },
  "/reglement": {
    file: "reglement", title: "Règlement", body: "code-body", css: "reglement", bg: '    <div class="code-grid"></div>\n',
    fonts: "family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Outfit",
    js: ["reglement"],
  },
};

async function render(route, page) {
  const fill = {
    title: page.file === "index" ? page.title : `${page.title} · Los Santos Reborn`,
    fonts: page.fonts || FONTS,
    css: page.css ? `    <link rel="stylesheet" href="/css/${page.css}.css" />\n` : "",
    body: page.body ? ` class="${page.body}"` : "",
    bg: page.bg || "",
    page: HTML[page.file],
    scripts: page.js.map((js) => `    <script src="/js/${js}.js"></script>\n`).join(""),
  };
  const site = await readSite().catch(() => ({ texts: {}, discord: DISCORD_DEFAULT }));
  const esc = (v) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return HTML.layout
    .replace(`<a href="${route}">`, `<a class="active" href="${route}">`)
    .replace(`<a href="${route}" data-staff-nav`, `<a class="active" href="${route}" data-staff-nav`)
    .replace(/\{\{(\w+)\}\}/g, (_, key) => fill[key])
    .replace(/(<(\w+)\b[^>]*\bdata-edit="([\w.-]+)"[^>]*>)[\s\S]*?(<\/\2>)/g, (all, open, _tag, key, close) =>
      site.texts[key] ? open + esc(site.texts[key]) + close : all
    )
    .replaceAll(DISCORD_DEFAULT, esc(site.discord));
}

for (const [route, page] of Object.entries(PAGES)) {
  app.get([route, `${route === "/" ? "/index" : route}.html`], async (_req, res) => res.type("html").send(await render(route, page)));
}
app.get(["/wl", "/boutique"], (req, res) => res.redirect(req.path === "/wl" ? "/whitelist" : "/"));

// Erreur imprévue (ex. Supabase injoignable) : réponse propre au lieu d'un plantage
app.use((err, _req, res, _next) => {
  if (err.status !== 409) console.error(err);
  res.status(err.status === 409 ? 409 : 500).json({ error: err.status === 409 ? err.message : "Erreur serveur. Réessaie dans un instant." });
});

// En local : npm start (les fichiers de public/ sont servis ici ; sur Vercel, c'est le CDN qui s'en charge)
if (!process.env.VERCEL) {
  app.use(express.static(fileURLToPath(new URL("./public", import.meta.url))));
  const PORT = Number(process.env.PORT || 5173);
  app.listen(PORT, () => console.log(`Los Santos Reborn : http://localhost:${PORT}`));
}

export default app;
