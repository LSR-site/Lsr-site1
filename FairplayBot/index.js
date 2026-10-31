require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const GERANT_ROLE_ID = process.env.GERANT_ROLE_ID;
const REGLEMENT_ROLE_ID = process.env.REGLEMENT_ROLE_ID;
const PATRON_ROLE_ID = process.env.PATRON_ROLE_ID;
const AUTO_ROLE_ID = process.env.AUTO_ROLE_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const LOG_TICKET_CHANNEL_ID = process.env.LOG_TICKET_CHANNEL_ID;
const LOG_MODERATION_CHANNEL_ID = process.env.LOG_MODERATION_CHANNEL_ID;
const LOG_JOIN_LEAVE_CHANNEL_ID = process.env.LOG_JOIN_LEAVE_CHANNEL_ID;
const LOG_IDENTITE_CHANNEL_ID = process.env.LOG_IDENTITE_CHANNEL_ID;
const LOG_ROLE_CHANNEL_ID = process.env.LOG_ROLE_CHANNEL_ID || LOG_MODERATION_CHANNEL_ID;
const CASIER_LOG_CHANNEL_ID = process.env.CASIER_LOG_CHANNEL_ID;
const ENTREPRISE_CHANNEL_ID = process.env.ENTREPRISE_CHANNEL_ID;

// =========================
// RÔLES - VISIBILITÉ TICKETS
// =========================
const ROLE_FONDA_ID = process.env.ROLE_FONDA_ID;
const ROLE_COFONDA_ID = process.env.ROLE_COFONDA_ID;
const ROLE_DEV_ID = process.env.ROLE_DEV_ID;
const ROLE_GERANT_STAFF_ID = process.env.ROLE_GERANT_STAFF_ID;
const ROLE_RESP_LEGAL_ID = process.env.ROLE_RESP_LEGAL_ID;
const ROLE_RESP_ILLEGAL_ID = process.env.ROLE_RESP_ILLEGAL_ID;
const ROLE_ADMIN_ID = process.env.ROLE_ADMIN_ID;
const ROLE_MODERATEUR_ID = process.env.ROLE_MODERATEUR_ID;
const ROLE_HELPER_ID = process.env.ROLE_HELPER_ID;
const ROLE_SUPPORT_ID = process.env.ROLE_SUPPORT_ID;
const ROLE_RECRUTEUR_ID = process.env.ROLE_RECRUTEUR_ID;
const ROLE_STAFF_ID = process.env.ROLE_STAFF_ID;


const LOGO = process.env.LOGO;
const BANNER_WELCOME = process.env.BANNER_WELCOME || process.env.BANNIERE;
const BANNER_ANNONCE = process.env.BANNER_ANNONCE || process.env.BANNIERE;
const BANNER_TICKET = process.env.BANNER_TICKET || process.env.BANNIERE;
const BANNIERE_REGLEMENT = process.env.BANNIERE_REGLEMENT;
const BANNER_BOUTIQUE = process.env.BANNER_BOUTIQUE || process.env.BANNIERE;
const BANNER_PATCHNOTE = process.env.BANNER_PATCHNOTE || process.env.BANNER_ANNONCE || process.env.BANNIERE;

const ORANGE = 0xff7a00;
const RED = 0xff0000;
const GREEN = 0x00ff00;

const CATEGORY_IDS = {
  support: process.env.CATEGORY_SUPPORT_ID,
  plainte: process.env.CATEGORY_PLAINTE_ID || process.env.CATEGORY_SCENE_ID,
  entreprise: process.env.CATEGORY_ENTREPRISE_ID,
  scene: "1501753921993969765",
  illegal: process.env.CATEGORY_ILLEGAL_ID,
  candidature_staff: process.env.CATEGORY_STAFF_ID,
  mort_rp: "1501753921993969765",
  vip: process.env.CATEGORY_VIP_ID || process.env.BOUTIQUE_CATEGORY_ID,
  dons: process.env.CATEGORY_DONS_ID || process.env.BOUTIQUE_CATEGORY_ID,
  convocation: process.env.CATEGORY_CONVOCATION_ID || process.env.CATEGORY_SCENE_ID,
  deban: "1501753921993969765",
  gerant: process.env.CATEGORY_GERANT_ID,
  recrutement: process.env.CATEGORY_RECRUTEMENT_ID,
  boutique: process.env.BOUTIQUE_CATEGORY_ID
};

// Adresse du site Los Santos Reborn (ex. https://lsr-site1.onrender.com)
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");

const ENTREPRISES_FILE = path.join(__dirname, "entreprises.json");
const CASIERS_FILE = path.join(__dirname, "casiers.json");

const slashCommands = [
  new SlashCommandBuilder()
    .setName("test")
    .setDescription("Vérifie que le bot fonctionne"),

  new SlashCommandBuilder()
    .setName("reglement")
    .setDescription("Affiche le panneau de validation du règlement"),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Affiche le centre de support et de tickets"),

  new SlashCommandBuilder()
    .setName("boutique")
    .setDescription("Affiche le panneau de la boutique Discord"),

  new SlashCommandBuilder()
    .setName("patchnote")
    .setDescription("Publie une patchnote Los Santos Reborn améliorée")
    .addStringOption(option =>
      option.setName("version").setDescription("Version du patch, ex: 2.4.0").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("nouveautes").setDescription("Nouveautés principales").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("ameliorations").setDescription("Améliorations apportées").setRequired(false)
    )
    .addStringOption(option =>
      option.setName("corrections").setDescription("Bugs corrigés").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("annonce")
    .setDescription("Crée une annonce avec un template")
    .addAttachmentOption(option =>
      option
        .setName("photo")
        .setDescription("Photo ou bannière à afficher dans l'annonce")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("entreprises")
    .setDescription("Affiche la liste des entreprises"),

  new SlashCommandBuilder()
    .setName("majentreprises")
    .setDescription("Met à jour le salon des entreprises"),

  new SlashCommandBuilder()
    .setName("entreprise-set")
    .setDescription("Ajoute ou modifie une entreprise")
    .addStringOption(option => option.setName("nom").setDescription("Nom de l'entreprise").setRequired(true))
    .addStringOption(option => option.setName("patron").setDescription("Nom du patron").setRequired(true))
    .addStringOption(option => option.setName("statut").setDescription("Statut de l'entreprise").setRequired(true))
    .addStringOption(option => option.setName("recrutement").setDescription("État du recrutement").setRequired(true))
    .addStringOption(option => option.setName("logo").setDescription("Lien du logo de l'entreprise").setRequired(false)),

  new SlashCommandBuilder()
    .setName("entreprise-remove")
    .setDescription("Supprime une entreprise")
    .addStringOption(option => option.setName("nom").setDescription("Nom de l'entreprise").setRequired(true)),

  new SlashCommandBuilder()
    .setName("patron-add")
    .setDescription("Ajoute le rôle patron à un membre")
    .addUserOption(option => option.setName("membre").setDescription("Membre à définir comme patron").setRequired(true))
    .addStringOption(option => option.setName("entreprise").setDescription("Nom de l'entreprise").setRequired(true)),

  new SlashCommandBuilder()
    .setName("patron-remove")
    .setDescription("Retire le rôle patron à un membre")
    .addUserOption(option => option.setName("membre").setDescription("Membre concerné").setRequired(true)),

  new SlashCommandBuilder()
    .setName("casier")
    .setDescription("Affiche le casier d'un membre")
    .addUserOption(option => option.setName("membre").setDescription("Membre concerné").setRequired(true)),

  new SlashCommandBuilder()
    .setName("casier-add")
    .setDescription("Ajoute une sanction au casier d'un membre")
    .addUserOption(option => option.setName("membre").setDescription("Membre concerné").setRequired(true))
    .addStringOption(option => option.setName("sanction").setDescription("Type de sanction").setRequired(true))
    .addStringOption(option => option.setName("raison").setDescription("Raison de la sanction").setRequired(true)),

  new SlashCommandBuilder()
    .setName("casier-clear")
    .setDescription("Supprime le casier d'un membre")
    .addUserOption(option => option.setName("membre").setDescription("Membre concerné").setRequired(true)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertit un membre")
    .addUserOption(option => option.setName("membre").setDescription("Membre à avertir").setRequired(true))
    .addStringOption(option => option.setName("raison").setDescription("Raison du warn").setRequired(false)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulse un membre du serveur")
    .addUserOption(option => option.setName("membre").setDescription("Membre à expulser").setRequired(true))
    .addStringOption(option => option.setName("raison").setDescription("Raison du kick").setRequired(false)),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannit un membre du serveur")
    .addUserOption(option => option.setName("membre").setDescription("Membre à bannir").setRequired(true))
    .addStringOption(option => option.setName("raison").setDescription("Raison du ban").setRequired(false))
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

client.once("clientReady", async () => {
  startSocialMonitor();
  console.log(`✅ Los Santos Reborn connecté : ${client.user.tag}`);

  try {
    if (GUILD_ID) {
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.commands.set(slashCommands.map(command => command.toJSON()));
      console.log(`✅ ${slashCommands.length} commandes / enregistrées sur ${guild.name}`);
    } else {
      await client.application.commands.set(slashCommands.map(command => command.toJSON()));
      console.log(`✅ ${slashCommands.length} commandes / globales enregistrées`);
      console.log("ℹ️ Ajoute GUILD_ID dans le .env pour un affichage immédiat sur ton serveur.");
    }
  } catch (error) {
    console.error("❌ Impossible d'enregistrer les commandes slash :", error);
  }

  // Ticket Log + Logs Staff selon le tableau fourni :
  // Fonda, Co-Fonda, DEV, Gérant Staff et Admin uniquement.
  const logAccessRoles = [
    ROLE_FONDA_ID,
    ROLE_COFONDA_ID,
    ROLE_DEV_ID,
    ROLE_GERANT_STAFF_ID,
    ROLE_ADMIN_ID
  ];

  await syncPrivateStaffChannelPermissions(
    client.guilds.cache.get(GUILD_ID) || client.guilds.cache.first(),
    LOG_TICKET_CHANNEL_ID,
    logAccessRoles,
    "Ticket Log"
  ).catch(() => {});

  await syncPrivateStaffChannelPermissions(
    client.guilds.cache.get(GUILD_ID) || client.guilds.cache.first(),
    LOG_MODERATION_CHANNEL_ID,
    logAccessRoles,
    "Logs Staff"
  ).catch(() => {});
});

async function syncPrivateStaffChannelPermissions(guild, channelId, roleIds, label) {
  if (!guild || !channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    console.log(`⚠️ ${label} introuvable ou non textuel : ${channelId}`);
    return;
  }

  const cleanRoleIds = [...new Set(roleIds.filter(Boolean))];

  try {
    await channel.permissionOverwrites.set([
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      ...cleanRoleIds.map(roleId => ({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      })),
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels
        ]
      }
    ]);

    console.log(`✅ Permissions synchronisées : ${label}`);
  } catch (error) {
    console.error(`❌ Impossible de synchroniser ${label} :`, error);
  }
}

function sendLog(guild, channelId, embed) {
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);

  if (!channel) {
    console.log(`❌ Salon log introuvable : ${channelId}`);
    return;
  }

  if (!channel.isTextBased()) {
    console.log(`❌ Le salon log n'est pas un salon texte : ${channel.name}`);
    return;
  }

  channel.send({ embeds: [embed] }).catch(console.error);
}

function hasStaff(member) {
  return (
    member.roles.cache.has(STAFF_ROLE_ID) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readEntreprises() {
  return readJson(ENTREPRISES_FILE, []);
}

function saveEntreprises(data) {
  saveJson(ENTREPRISES_FILE, data);
}

function readCasiers() {
  return readJson(CASIERS_FILE, {});
}

function saveCasiers(data) {
  saveJson(CASIERS_FILE, data);
}

const TICKET_ROLE_ACCESS = {
  // Tableau fourni :
  // Support : Fonda, Co-Fonda, DEV, Gérant Staff, Resp. Légal, Resp. Illégal,
  //           Admin, Modérateur, Helper, Support, Staff
  support: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_DEV_ID, ROLE_GERANT_STAFF_ID,
    ROLE_RESP_LEGAL_ID, ROLE_RESP_ILLEGAL_ID, ROLE_ADMIN_ID,
    ROLE_MODERATEUR_ID, ROLE_HELPER_ID, ROLE_SUPPORT_ID, ROLE_STAFF_ID
  ],

  // Plainte : Fonda, Co-Fonda, Gérant Staff, Resp. Légal, Resp. Illégal,
  //           Admin, Modérateur
  plainte: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_RESP_LEGAL_ID, ROLE_RESP_ILLEGAL_ID, ROLE_ADMIN_ID,
    ROLE_MODERATEUR_ID
  ],

  // Candidature Staff : Fonda, Co-Fonda, Gérant Staff, Admin, Recruteur
  candidature_staff: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_ADMIN_ID, ROLE_RECRUTEUR_ID
  ],

  // Mort RP : Fonda, Co-Fonda, Gérant Staff, Resp. Légal, Resp. Illégal,
  //           Admin, Modérateur
  mort_rp: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_RESP_LEGAL_ID, ROLE_RESP_ILLEGAL_ID, ROLE_ADMIN_ID,
    ROLE_MODERATEUR_ID
  ],

  // Demande VIP : Fonda, Co-Fonda, Gérant Staff, Admin, Support
  vip: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_ADMIN_ID, ROLE_SUPPORT_ID
  ],

  // Dons : uniquement Fonda et Co-Fonda
  dons: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID
  ],

  // Entreprise : Fonda, Co-Fonda, Gérant Staff, Resp. Légal, Admin, Modérateur
  entreprise: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_RESP_LEGAL_ID, ROLE_ADMIN_ID, ROLE_MODERATEUR_ID
  ],

  // Illégal : Fonda, Co-Fonda, Gérant Staff, Resp. Illégal, Admin, Modérateur
  illegal: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_RESP_ILLEGAL_ID, ROLE_ADMIN_ID, ROLE_MODERATEUR_ID
  ],

  // Scène : Fonda, Co-Fonda, Gérant Staff, Resp. Légal, Resp. Illégal,
  //         Admin, Modérateur, Helper, Support, Staff
  scene: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_RESP_LEGAL_ID, ROLE_RESP_ILLEGAL_ID, ROLE_ADMIN_ID,
    ROLE_MODERATEUR_ID, ROLE_HELPER_ID, ROLE_SUPPORT_ID, ROLE_STAFF_ID
  ],

  // Convocation : Fonda, Co-Fonda, Gérant Staff, Resp. Légal, Resp. Illégal,
  //              Admin, Modérateur
  convocation: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_RESP_LEGAL_ID, ROLE_RESP_ILLEGAL_ID, ROLE_ADMIN_ID,
    ROLE_MODERATEUR_ID
  ],

  // DBan / Ban : Fonda, Co-Fonda, Gérant Staff, Admin, Modérateur
  deban: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID,
    ROLE_ADMIN_ID, ROLE_MODERATEUR_ID
  ],

  // Contact Gérant : Fonda, Co-Fonda, Gérant Staff
  gerant: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID, ROLE_GERANT_STAFF_ID
  ],

  // Boutique générale : Fonda et Co-Fonda
  boutique: [
    ROLE_FONDA_ID, ROLE_COFONDA_ID
  ]
};


// ===== RÉSEAUX LOS SANTOS REBORN =====
const SOCIAL_ANNOUNCE_CHANNEL_ID = process.env.SOCIAL_ANNOUNCE_CHANNEL_ID || "";
const SOCIAL_CHECK_INTERVAL_SECONDS = Math.max(60, Number(process.env.SOCIAL_CHECK_INTERVAL_SECONDS || 180));
const TWITCH_CHANNEL_NAME = process.env.TWITCH_CHANNEL_NAME || "";
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || "";
const INSTAGRAM_USERNAME = process.env.INSTAGRAM_USERNAME || "";
const FACEBOOK_PAGE = process.env.FACEBOOK_PAGE || "";
const TIKTOK_FEED_ENDPOINT = process.env.TIKTOK_FEED_ENDPOINT || "";
const INSTAGRAM_FEED_ENDPOINT = process.env.INSTAGRAM_FEED_ENDPOINT || "";
const FACEBOOK_FEED_ENDPOINT = process.env.FACEBOOK_FEED_ENDPOINT || "";

const ticketTypes = {
  support: {
    type: "support",
    name: "support",
    label: "Ticket Support",
    emoji: "🎫",
    roleIds: TICKET_ROLE_ACCESS.support
  },
  plainte: {
    type: "plainte",
    name: "plainte",
    label: "Ticket Plainte",
    emoji: "⚠️",
    roleIds: TICKET_ROLE_ACCESS.plainte
  },
  candidature_staff: {
    type: "candidature_staff",
    name: "candidature-staff",
    label: "Candidature Staff",
    emoji: "🛡️",
    roleIds: TICKET_ROLE_ACCESS.candidature_staff
  },
  mort_rp: {
    type: "mort_rp",
    name: "mort-rp",
    label: "Mort RP",
    emoji: "☠️",
    roleIds: TICKET_ROLE_ACCESS.mort_rp
  },
  vip: {
    type: "vip",
    name: "demande-vip",
    label: "Demande VIP",
    emoji: "💎",
    roleIds: TICKET_ROLE_ACCESS.vip
  },
  dons: {
    type: "dons",
    name: "ticket-dons",
    label: "Ticket Dons",
    emoji: "💸",
    roleIds: TICKET_ROLE_ACCESS.dons
  },
  entreprise: {
    type: "entreprise",
    name: "demande-entreprise",
    label: "Ticket Entreprise",
    emoji: "💼",
    roleIds: TICKET_ROLE_ACCESS.entreprise
  },
  illegal: {
    type: "illegal",
    name: "demande-illegal",
    label: "Ticket Illégal",
    emoji: "🔫",
    roleIds: TICKET_ROLE_ACCESS.illegal
  },
  scene: {
    type: "scene",
    name: "probleme-scene",
    label: "Ticket Scène",
    emoji: "🎬",
    roleIds: TICKET_ROLE_ACCESS.scene
  },
  convocation: {
    type: "convocation",
    name: "convocation",
    label: "Convocation",
    emoji: "🚨",
    roleIds: TICKET_ROLE_ACCESS.convocation
  },
  deban: {
    type: "deban",
    name: "demande-deban",
    label: "DBan / Ban",
    emoji: "⛔",
    roleIds: TICKET_ROLE_ACCESS.deban
  },
  gerant: {
    type: "gerant",
    name: "contact-gerant",
    label: "Contact Gérant",
    emoji: "👑",
    roleIds: TICKET_ROLE_ACCESS.gerant
  },
  boutique: {
    type: "boutique",
    name: "boutique",
    label: "Boutique",
    emoji: "🛒",
    roleIds: TICKET_ROLE_ACCESS.boutique
  }
};

// =========================
// LIEN AVEC LE SITE (même base Supabase que le site)
// =========================
const siteLinked = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

async function supabase(pathname, options = {}) {
  const res = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${pathname}`, {
    ...options,
    headers: { apikey: process.env.SUPABASE_SECRET_KEY, "Content-Type": "application/json", ...options.headers }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} : ${await res.text()}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

// Les écritures du bot passent une par une ; si le site a écrit entre-temps, on recommence
let siteQueue = Promise.resolve();
function updateTickets(change) {
  const run = siteQueue.then(() => writeTickets(change));
  siteQueue = run.catch(() => {});
  return run;
}

async function writeTickets(change) {
  for (let i = 0; i < 8; i++) {
    if (i) await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
    const row = (await supabase("site_data?key=eq.tickets&select=value,updated_at"))[0];
    const data = row?.value || {};
    data.items = Array.isArray(data.items) ? data.items : [];
    data.nextNumber = Number(data.nextNumber) || 1;
    if (change(data) === false) return data;
    const stamp = new Date().toISOString();
    const done = row
      ? await supabase(`site_data?key=eq.tickets&updated_at=eq.${encodeURIComponent(row.updated_at)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ value: data, updated_at: stamp }) })
      : await supabase("site_data", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ key: "tickets", value: data, updated_at: stamp }) });
    if (done?.length) return data;
  }
  throw new Error("trop de modifications en même temps");
}

// Salons Discord qui sont aussi des tickets du site
const siteTicketChannels = new Set();
async function refreshSiteTickets() {
  if (!siteLinked()) return;
  try {
    const row = (await supabase("site_data?key=eq.tickets&select=value"))[0];
    siteTicketChannels.clear();
    for (const t of row?.value?.items || []) if (t.channelId) siteTicketChannels.add(t.channelId);
  } catch (error) {
    console.error("❌ Site :", error.message);
  }
}

// Types de tickets du bot → catégories du site
const SITE_CATEGORY = {
  candidature_staff: "candidature", mort_rp: "mort-rp", gerant: "direction", dons: "donation",
  boutique: "autre", plainte: "scene", convocation: "support"
};

async function addTicketToSite(interaction, ticket, channel, extraText) {
  if (!siteLinked()) return;
  const authorName = interaction.member?.displayName || interaction.user.username;
  const first = String(extraText || "").replace(/\*\*/g, "").trim();
  siteTicketChannels.add(channel.id);
  await updateTickets((data) => {
    data.items.unshift({
      id: crypto.randomUUID(),
      number: data.nextNumber++,
      key: crypto.randomBytes(16).toString("hex"),
      status: "open",
      category: SITE_CATEGORY[ticket.type] || ticket.type,
      subject: `${ticket.label} (ouvert sur Discord)`,
      authorName,
      discordUserId: interaction.user.id,
      channelId: channel.id,
      createdAt: new Date().toISOString(),
      closedAt: null,
      messages: first ? [{ id: crypto.randomUUID(), from: "player", author: authorName, content: first.slice(0, 2000), image: "", link: "", createdAt: new Date().toISOString(), discordId: "" }] : []
    });
  });
}

// Message écrit sur Discord dans un ticket → visible sur le site
async function mirrorToSite(message) {
  const image = message.attachments.find((a) => !a.contentType || a.contentType.startsWith("image/"))?.url || "";
  if (!message.content && !image) return;
  await updateTickets((data) => {
    const t = data.items.find((x) => x.channelId === message.channel.id);
    if (!t || (t.messages || []).some((m) => m.discordId === message.id)) return false;
    const player = t.discordUserId === message.author.id;
    t.messages = [...(t.messages || []), {
      id: crypto.randomUUID(),
      from: player ? "player" : "staff",
      author: player ? t.authorName : "Staff",
      content: message.content.slice(0, 2000),
      image,
      link: "",
      createdAt: message.createdAt.toISOString(),
      discordId: message.id
    }];
  });
}

client.once("clientReady", () => {
  if (!siteLinked()) return;
  console.log("🔗 Lié au site via Supabase");
  refreshSiteTickets();
  setInterval(refreshSiteTickets, 20000);
});

client.on("messageCreate", async (message) => {
  if (!siteLinked() || !message.guild) return;

  // Ticket ouvert sur le site : bouton Fermer + log
  if (message.author.id === client.user.id && message.embeds[0]?.title?.startsWith("Ticket #")) {
    siteTicketChannels.add(message.channel.id);
    sendLog(message.guild, LOG_TICKET_CHANNEL_ID, new EmbedBuilder()
      .setColor(GREEN)
      .setTitle("🎫 Ticket ouvert (site)")
      .addFields({ name: "📄 Salon", value: `${message.channel}` }, { name: "📝 Sujet", value: message.embeds[0].title })
      .setTimestamp());
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger)
    );
    return message.channel.send({ content: "Le staff peut répondre ici, la réponse s'affiche sur le site.", components: [row] }).catch(() => {});
  }

  if (message.author.bot || !siteTicketChannels.has(message.channel.id)) return;
  mirrorToSite(message).catch((error) => console.error("❌ Site :", error.message));
});

// Ticket supprimé sur Discord → retiré du site
client.on("channelDelete", (channel) => {
  if (!siteLinked() || !siteTicketChannels.has(channel.id)) return;
  siteTicketChannels.delete(channel.id);
  updateTickets((data) => {
    const before = data.items.length;
    data.items = data.items.filter((t) => t.channelId !== channel.id);
    if (data.items.length === before) return false;
  }).catch((error) => console.error("❌ Site :", error.message));
});

async function createTicket(interaction, ticket, extraText = "") {
  if (!ticket) {
    return interaction.reply({
      content: "❌ Type de ticket introuvable.",
      flags: 64
    });
  }

  const allowedRoleIds = [...new Set((ticket.roleIds || []).filter(Boolean))];

  if (!allowedRoleIds.length) {
    return interaction.reply({
      content: "❌ Aucun rôle n'est configuré pour ce ticket. Vérifie les ROLE_..._ID dans ton `.env`.",
      flags: 64
    });
  }

  const parentId = CATEGORY_IDS[ticket.type] || null;

  const existing = interaction.guild.channels.cache.find(
    c => c.name === `${ticket.name}-${interaction.user.id}`
  );

  if (existing) {
    return interaction.reply({
      content: `❌ Tu as déjà un ticket ouvert : ${existing}`,
      flags: 64
    });
  }

  const channel = await interaction.guild.channels.create({
    name: `${ticket.name}-${interaction.user.id}`,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      ...allowedRoleIds.map(roleId => ({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages
        ]
      })),
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ManageMessages
        ]
      }
    ]
  });

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Fermer le ticket")
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setAuthor({ name: "Los Santos Reborn | Ticket", iconURL: LOGO })
    .setTitle(`${ticket.emoji} ${ticket.label}`)
    .setDescription(
      `Bonjour ${interaction.user},\n\n` +
      `Tu as ouvert un ticket : **${ticket.label}**.\n\n` +
      "Explique clairement ta demande.\n" +
      extraText
    )
    .setThumbnail(LOGO)
    .setTimestamp();

  if (BANNER_TICKET) embed.setImage(BANNER_TICKET);

  await channel.send({
    content: `${interaction.user} ${allowedRoleIds.map(id => `<@&${id}>`).join(" ")}`,
    embeds: [embed],
    components: [closeButton]
  });

  const log = new EmbedBuilder()
    .setColor(GREEN)
    .setTitle("🎫 Ticket ouvert")
    .addFields(
      { name: "👤 Joueur", value: `${interaction.user.tag}`, inline: true },
      { name: "📂 Type", value: ticket.label, inline: true },
      { name: "📄 Salon", value: `${channel}`, inline: true }
    )
    .setTimestamp();

  sendLog(interaction.guild, LOG_TICKET_CHANNEL_ID, log);

  // Sans attendre : Discord exige une réponse rapide à l'interaction
  addTicketToSite(interaction, ticket, channel, extraText).catch((error) => console.error("❌ Site :", error.message));

  return interaction.reply({
    content: `✅ Ticket créé : ${channel}`,
    flags: 64
  });
}

async function updateEntreprisesChannel(guild) {
  if (!ENTREPRISE_CHANNEL_ID) return;

  const channel = guild.channels.cache.get(ENTREPRISE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const data = readEntreprises();

  const embeds = data.length
    ? data.map(e => {
        const embed = new EmbedBuilder()
          .setColor(ORANGE)
          .setTitle(`🏢 ${e.nom}`)
          .addFields(
            { name: "👨‍💼 Patron", value: e.patron || "Aucun", inline: true },
            { name: "📌 Statut", value: e.statut || "Inconnu", inline: true },
            { name: "📈 Recrutement", value: e.recrutement || "Fermé", inline: true }
          )
          .setTimestamp();

        if (e.logo) {
          embed.setThumbnail(e.logo);
        }

        return embed;
      })
    : [
        new EmbedBuilder()
          .setColor(ORANGE)
          .setTitle("📊 Tableau des entreprises")
          .setDescription("Aucune entreprise enregistrée.")
          .setThumbnail(LOGO)
          .setTimestamp()
      ];

  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const botMessages = messages
    ? messages.filter(m => m.author.id === client.user.id)
    : null;

  if (botMessages && botMessages.size > 0) {
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => {});
    }
  }

  for (let i = 0; i < embeds.length; i += 10) {
    await channel.send({
      embeds: embeds.slice(i, i + 10)
    });
  }
}

client.on("guildMemberAdd", async (member) => {

  // Attribution automatique du rôle
  if (AUTO_ROLE_ID) {
    await member.roles.add(AUTO_ROLE_ID).catch(console.error);
  }

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setAuthor({ name: "Los Santos Reborn", iconURL: LOGO })
    .setTitle("🟠 Bienvenue sur Los Santos Reborn")
    .setDescription(
      "📜 Merci de lire le règlement du serveur\n" +
      "🪪 Merci de compléter votre identité RP\n\n" +
      "Bon RP parmi nous !"
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setImage(BANNER_WELCOME)
    .setFooter({
      text: "Los Santos Reborn • GTA RP",
      iconURL: LOGO
    });
  const log = new EmbedBuilder()
    .setColor(GREEN)
    .setTitle("📥 Arrivée membre")
    .setTimestamp()
    .addFields(
      { name: "👤 Membre", value: `${member.user.tag}`, inline: true },
      { name: "🆔 ID", value: `${member.id}`, inline: true }
    );
if (channel && channel.isTextBased()) {
  await channel.send({
    content: `👋 Bienvenue ${member} !`,
    embeds: [embed]
  });
}
  sendLog(member.guild, LOG_JOIN_LEAVE_CHANNEL_ID, log);
});

client.on("guildMemberRemove", async (member) => {
  const log = new EmbedBuilder()
    .setColor(RED)
    .setTitle("📤 Départ membre")
    .setTimestamp()
    .addFields(
      { name: "👤 Membre", value: `${member.user.tag}`, inline: true },
      { name: "🆔 ID", value: `${member.id}`, inline: true }
    );

  sendLog(member.guild, LOG_JOIN_LEAVE_CHANNEL_ID, log);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const addedRoles = newMember.roles.cache.filter(
    role => !oldMember.roles.cache.has(role.id)
  );

  const removedRoles = oldMember.roles.cache.filter(
    role => !newMember.roles.cache.has(role.id)
  );

  if (addedRoles.size === 0 && removedRoles.size === 0) return;

  const logs = await newMember.guild.fetchAuditLogs({
    limit: 1,
    type: 25
  }).catch(() => null);

  const executor = logs?.entries.first()?.executor;

  for (const role of addedRoles.values()) {
    const embed = new EmbedBuilder()
      .setColor(GREEN)
      .setTitle("➕ Rôle ajouté")
      .addFields(
        { name: "👤 Membre", value: `${newMember.user.tag}`, inline: true },
        { name: "🏷️ Rôle", value: `${role}`, inline: true },
        { name: "👮 Modifié par", value: executor ? executor.tag : "Inconnu", inline: true }
      )
      .setTimestamp();

    sendLog(newMember.guild, LOG_ROLE_CHANNEL_ID, embed);
  }

  for (const role of removedRoles.values()) {
    const embed = new EmbedBuilder()
      .setColor(RED)
      .setTitle("➖ Rôle retiré")
      .addFields(
        { name: "👤 Membre", value: `${newMember.user.tag}`, inline: true },
        { name: "🏷️ Rôle", value: `${role}`, inline: true },
        { name: "👮 Modifié par", value: executor ? executor.tag : "Inconnu", inline: true }
      )
      .setTimestamp();

    sendLog(newMember.guild, LOG_ROLE_CHANNEL_ID, embed);
  }
});

client.on("guildBanAdd", async (ban) => {
  const log = new EmbedBuilder()
    .setColor(RED)
    .setTitle("🔨 Membre banni")
    .setTimestamp()
    .addFields(
      { name: "👤 Membre", value: `${ban.user.tag}`, inline: true },
      { name: "🆔 ID", value: `${ban.user.id}`, inline: true },
      { name: "📝 Raison", value: ban.reason || "Aucune raison indiquée" }
    );

  sendLog(ban.guild, LOG_MODERATION_CHANNEL_ID, log);
});

// Stockage temporaire des annonces en cours de création.
// La photo choisie dans /annonce est conservée jusqu'à l'envoi du formulaire.
const pendingAnnouncements = new Map();

function getAnnouncementStyle(type) {
  const styles = {
    global: {
      label: "Annonce Globale",
      emoji: "📢",
      color: ORANGE,
      title: "ANNONCE GLOBALE"
    },
    evenement: {
      label: "Événement",
      emoji: "🎉",
      color: 0xF1C40F,
      title: "ÉVÉNEMENT"
    },
    legal: {
      label: "Annonce Légale",
      emoji: "🛡️",
      color: 0x3498DB,
      title: "ANNONCE LÉGALE"
    },
    illegal: {
      label: "Annonce Illégale",
      emoji: "🔴",
      color: 0xE74C3C,
      title: "ANNONCE ILLÉGALE"
    }
  };

  return styles[type] || styles.global;
}

function buildAnnouncementModal(type) {
  const style = getAnnouncementStyle(type);

  const modal = new ModalBuilder()
    .setCustomId(`annonce_modal:${type}`)
    .setTitle(`${style.emoji} ${style.label}`.slice(0, 45));

  const titre = new TextInputBuilder()
    .setCustomId("annonce_titre")
    .setLabel("Titre de l'annonce")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex : Ouverture exceptionnelle")
    .setMaxLength(100)
    .setRequired(true);

  const description = new TextInputBuilder()
    .setCustomId("annonce_description")
    .setLabel("Description / message")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Écris ici le contenu principal de l'annonce...")
    .setMaxLength(1800)
    .setRequired(true);

  const date = new TextInputBuilder()
    .setCustomId("annonce_date")
    .setLabel(type === "evenement" ? "Date de l'événement" : "Date (optionnel)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex : 20/09/2026")
    .setMaxLength(50)
    .setRequired(type === "evenement");

  const heure = new TextInputBuilder()
    .setCustomId("annonce_heure")
    .setLabel(type === "evenement" ? "Heure de l'événement" : "Heure (optionnel)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex : 21h00")
    .setMaxLength(50)
    .setRequired(type === "evenement");

  const lieu = new TextInputBuilder()
    .setCustomId("annonce_lieu")
    .setLabel(type === "evenement" ? "Lieu de l'événement" : "Lieu / information (optionnel)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(type === "illegal" ? "Ex : information communiquée en ville" : "Ex : Los Santos")
    .setMaxLength(100)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titre),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(date),
    new ActionRowBuilder().addComponents(heure),
    new ActionRowBuilder().addComponents(lieu)
  );

  return modal;
}


// ===== SURVEILLANCE AUTOMATIQUE DES RÉSEAUX =====
const socialSeen = new Map();
let socialBootCheck = true;

async function socialPost(platform, title, description, url, image, color) {
  const channel = client.channels.cache.get(SOCIAL_ANNOUNCE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const embed = new EmbedBuilder()
    .setColor(color || ORANGE)
    .setTitle(title)
    .setDescription(description || "Nouveau contenu Los Santos Reborn !")
    .setFooter({ text: `Los Santos Reborn • ${platform}` })
    .setTimestamp();
  if (LOGO) embed.setThumbnail(LOGO);
  if (image) embed.setImage(image);

  const payload = { embeds: [embed] };
  if (url) payload.components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(platform === "Twitch" ? "Regarder le live" : "Voir la publication")
        .setURL(url)
    )
  ];
  await channel.send(payload);
}

async function twitchCheck() {
  if (!TWITCH_CHANNEL_NAME || !TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) return;
  const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(TWITCH_CLIENT_ID)}&client_secret=${encodeURIComponent(TWITCH_CLIENT_SECRET)}&grant_type=client_credentials`, { method: "POST" });
  if (!tokenRes.ok) throw new Error(`token HTTP ${tokenRes.status}`);
  const token = (await tokenRes.json()).access_token;
  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(TWITCH_CHANNEL_NAME)}`, {
    headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`streams HTTP ${res.status}`);
  const stream = (await res.json()).data?.[0];
  if (!stream) { socialSeen.delete("twitch"); return; }
  const id = `${stream.user_id}:${stream.started_at}`;
  if (socialSeen.get("twitch") === id) return;
  socialSeen.set("twitch", id);
  if (socialBootCheck) return;
  await socialPost("Twitch", `🔴 ${stream.user_name} est en LIVE !`,
    `**${stream.title || "Los Santos Reborn est en direct !"}**${stream.game_name ? `\n🎮 ${stream.game_name}` : ""}`,
    `https://www.twitch.tv/${TWITCH_CHANNEL_NAME}`,
    stream.thumbnail_url?.replace("{width}","1280").replace("{height}","720"),
    0x9146FF);
}

async function youtubeCheck() {
  if (!YOUTUBE_CHANNEL_ID || !YOUTUBE_API_KEY) return;
  const cr = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(YOUTUBE_CHANNEL_ID)}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`);
  if (!cr.ok) throw new Error(`channel HTTP ${cr.status}`);
  const uploads = (await cr.json()).items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return;
  const pr = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploads)}&maxResults=1&key=${encodeURIComponent(YOUTUBE_API_KEY)}`);
  if (!pr.ok) throw new Error(`playlist HTTP ${pr.status}`);
  const item = (await pr.json()).items?.[0];
  const id = item?.snippet?.resourceId?.videoId;
  if (!id || socialSeen.get("youtube") === id) return;
  socialSeen.set("youtube", id);
  if (socialBootCheck) return;
  await socialPost("YouTube", "▶️ Nouvelle vidéo YouTube",
    `**${item.snippet.title || "Nouvelle vidéo Los Santos Reborn"}**`,
    `https://www.youtube.com/watch?v=${id}`,
    item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url,
    0xFF0000);
}

async function endpointCheck(platform, endpoint, usernameOrUrl, color) {
  if (!endpoint) return;
  const r = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const raw = await r.json();
  const post = Array.isArray(raw) ? raw[0] : (raw.latest || raw.post || raw);
  const id = String(post?.id || post?.postId || post?.url || "");
  const key = platform.toLowerCase();
  if (!id || socialSeen.get(key) === id) return;
  socialSeen.set(key, id);
  if (socialBootCheck) return;
  let fallback = usernameOrUrl;
  if (platform === "TikTok" && usernameOrUrl) fallback = `https://www.tiktok.com/@${usernameOrUrl}`;
  if (platform === "Instagram" && usernameOrUrl) fallback = `https://www.instagram.com/${usernameOrUrl}/`;
  await socialPost(platform, post.title || `📱 Nouvelle publication ${platform}`,
    post.description || post.caption || `Los Santos Reborn vient de publier sur ${platform}.`,
    post.url || fallback, post.image || post.thumbnail || null, color);
}

async function checkAllSocials() {
  try { await twitchCheck(); } catch(e) { console.error("❌ Twitch:", e.message); }
  try { await youtubeCheck(); } catch(e) { console.error("❌ YouTube:", e.message); }
  try { await endpointCheck("TikTok", TIKTOK_FEED_ENDPOINT, TIKTOK_USERNAME, 0x00F2EA); } catch(e) { console.error("❌ TikTok:", e.message); }
  try { await endpointCheck("Instagram", INSTAGRAM_FEED_ENDPOINT, INSTAGRAM_USERNAME, 0xE1306C); } catch(e) { console.error("❌ Instagram:", e.message); }
  try { await endpointCheck("Facebook", FACEBOOK_FEED_ENDPOINT, FACEBOOK_PAGE, 0x1877F2); } catch(e) { console.error("❌ Facebook:", e.message); }
  socialBootCheck = false;
}

function startSocialMonitor() {
  if (!SOCIAL_ANNOUNCE_CHANNEL_ID) return console.log("ℹ️ Réseaux : salon non configuré.");
  console.log(`📡 Réseaux Los Santos Reborn : vérification toutes les ${SOCIAL_CHECK_INTERVAL_SECONDS}s`);
  checkAllSocials();
  setInterval(checkAllSocials, SOCIAL_CHECK_INTERVAL_SECONDS * 1000);
}

client.on("interactionCreate", async (interaction) => {
  try {
    // =========================
    // COMMANDES SLASH /
    // =========================
    if (interaction.isChatInputCommand()) {
      const command = interaction.commandName;

      if (command === "test") {
        return interaction.reply({ content: "✅ Le bot fonctionne !", flags: 64 });
      }

      if (command === "reglement") {
        await interaction.deferReply({ flags: 64 });

        const embed = new EmbedBuilder()
          .setColor(ORANGE)
          .setAuthor({ name: "Los Santos Reborn | Règlement", iconURL: LOGO })
          .setTitle("📜 Validation du règlement")
          .setDescription(
            "Bienvenue sur **Los Santos Reborn**.\n\n" +
            "📜 Merci de lire attentivement le règlement du serveur.\n" +
            "🪪 Complète ensuite ton identité RP afin d'obtenir ton accès.\n\n" +
            `📒 ${SITE_URL ? `${SITE_URL}/reglement` : "https://sites.google.com/view/fairplayrp/accueil?authuser=0"}\n\n` +
            "⚠️ L'accès est accordé uniquement après validation de ton identité RP.\n" +
            "✅ Une identité déjà validée ne peut pas être enregistrée une seconde fois."
          )
          .setThumbnail(LOGO)
          .setFooter({ text: "Los Santos Reborn • GTA RP", iconURL: LOGO })
          .setTimestamp();

        if (BANNIERE_REGLEMENT) embed.setImage(BANNIERE_REGLEMENT);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("accept_reglement")
            .setLabel("✅ J'accepte le règlement")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("identity_panel")
            .setLabel("🪪 Compléter mon identité RP")
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.editReply("✅ Panneau règlement publié.");
      }

      if (command === "ticket") {
        await interaction.deferReply({ flags: 64 });

        const menu = new StringSelectMenuBuilder()
          .setCustomId("ticket_menu")
          .setPlaceholder("Choisir une catégorie")
          .addOptions(
            { label: "Ticket Support", description: "Besoin d'aide ou petit problème", value: "support", emoji: "🎫" },
            { label: "Ticket Plainte", description: "Déposer une plainte avec tes preuves", value: "plainte", emoji: "⚠️" },
            { label: "Candidature Staff", description: "Rejoindre l'équipe Los Santos Reborn", value: "candidature_staff", emoji: "🛡️" },
            { label: "Mort RP", description: "Déposer un dossier Mort RP", value: "mort_rp", emoji: "☠️" },
            { label: "Ticket Entreprise", description: "Projet ou reprise d'entreprise", value: "entreprise", emoji: "💼" },
            { label: "Ticket Illégal", description: "Projet ou reprise de groupe illégal", value: "illegal", emoji: "🔫" },
            { label: "Ticket Scène", description: "Signaler un problème lié à une scène", value: "scene", emoji: "🎬" },
            { label: "Convocation", description: "Ouvrir un ticket de convocation", value: "convocation", emoji: "🚨" },
            { label: "DBan / Ban", description: "Demande concernant un ban ou déban", value: "deban", emoji: "⛔" },
            { label: "Contact Gérant", description: "Contacter directement la gérance", value: "gerant", emoji: "👑" }
          );

        // Panneau large avec Components V2.
        // Si la version de discord.js installée est trop ancienne, le bot repasse
        // automatiquement sur un embed classique afin d'éviter de planter.
        if (
          ContainerBuilder &&
          TextDisplayBuilder &&
          SeparatorBuilder &&
          MediaGalleryBuilder &&
          MediaGalleryItemBuilder &&
          MessageFlags?.IsComponentsV2
        ) {
          const container = new ContainerBuilder()
            .setAccentColor(ORANGE)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "# 🎫 ASSISTANCE • LOS SANTOS REBORN\n" +
                "Notre équipe est là pour t'aider rapidement et proprement."
              )
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## ❓ BESOIN D'AIDE ?\n" +
                "🟧 Ouvre un ticket afin de contacter notre équipe **Los Santos Reborn**.\n\n" +
                "👥 Tu peux ouvrir plusieurs tickets en parallèle. Fermer un ticket ne t'empêche pas d'en ouvrir un autre."
              )
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## 📂 CATÉGORIE\n" +
                "Sélectionne la catégorie correspondant à ta demande dans le menu ci-dessous.\n" +
                "Ton salon privé sera créé automatiquement après ton choix."
              )
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(menu)
            );

          const localBanner = path.join(__dirname, "ticket_banner.png");
          const files = [];

          if (fs.existsSync(localBanner)) {
            container.addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                  .setURL("attachment://ticket_banner.png")
                  .setDescription("Assistance Los Santos Reborn")
              )
            );
            files.push({ attachment: localBanner, name: "ticket_banner.png" });
          } else if (BANNER_TICKET) {
            container.addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                  .setURL(BANNER_TICKET)
                  .setDescription("Assistance Los Santos Reborn")
              )
            );
          }

          container
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## ⚠️ IMPORTANTS\n" +
                "• Explique clairement ta demande\n" +
                "• Fournis des preuves si nécessaire\n" +
                "• Respecte le staff\n" +
                "• Évite les pings abusifs\n\n" +
                "*Notre équipe te répondra dans les plus brefs délais.*"
              ),
              new TextDisplayBuilder().setContent(
                "### 🟧 Los Santos Reborn\nMerci de ta confiance."
              )
            );

          await interaction.channel.send({
            components: [container],
            files,
            flags: MessageFlags.IsComponentsV2
          });

          return interaction.editReply("✅ Panneau tickets publié.");
        }

        // Compatibilité ancienne version de discord.js.
        const embed = new EmbedBuilder()
          .setColor(ORANGE)
          .setAuthor({ name: "Los Santos Reborn • Assistance", iconURL: LOGO })
          .setTitle("🎫 Assistance Los Santos Reborn")
          .setDescription(
            "### ❓ Besoin d'aide ?\n" +
            "> Ouvre un ticket afin de contacter notre équipe **Los Santos Reborn**.\n\n" +
            "> Tu peux ouvrir plusieurs tickets en parallèle.\n" +
            "> Fermer un ticket ne t'empêche pas d'en ouvrir un autre.\n\n" +
            "### 📂 Catégorie\n" +
            "> Sélectionne la catégorie correspondant à ta demande dans le menu ci-dessous.\n" +
            "> Ton salon privé sera créé automatiquement après ton choix.\n\n" +
            "### ⚠️ Importants\n" +
            "> • Explique clairement ta demande\n" +
            "> • Fournis des preuves si nécessaire\n" +
            "> • Respecte le staff\n" +
            "> • Évite les pings abusifs\n\n" +
            "*Notre équipe te répondra dans les plus brefs délais.*"
          )
          .setFooter({ text: "Los Santos Reborn • Centre d'assistance", iconURL: LOGO })
          .setTimestamp();

        if (BANNER_TICKET) embed.setImage(BANNER_TICKET);

        await interaction.channel.send({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(menu)]
        });

        return interaction.editReply("✅ Panneau tickets publié.");
      }

      if (command === "boutique") {
        await interaction.deferReply({ flags: 64 });

        const menu = new StringSelectMenuBuilder()
          .setCustomId("boutique_menu")
          .setPlaceholder("Choisir une catégorie boutique")
          .addOptions(
            { label: "Demande VIP", description: "Ouvrir un ticket pour une demande VIP", value: "vip", emoji: "💎" },
            { label: "Ticket Dons", description: "Ouvrir un ticket concernant un don", value: "donation", emoji: "💸" },
            { label: "Boutique", description: "Autre demande liée à la boutique", value: "boutique", emoji: "🛒" }
          );

        if (
          ContainerBuilder &&
          TextDisplayBuilder &&
          SeparatorBuilder &&
          MediaGalleryBuilder &&
          MediaGalleryItemBuilder &&
          MessageFlags?.IsComponentsV2
        ) {
          const container = new ContainerBuilder()
            .setAccentColor(ORANGE)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "# 🛒 BOUTIQUE • LOS SANTOS REBORN\n" +
                "Un espace simple pour ouvrir un **ticket boutique** et contacter directement notre équipe."
              )
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## ❓ BESOIN D'AIDE ?\n" +
                "🟧 Une question sur un véhicule, le VIP, une donation ou une autre demande ?\n\n" +
                "🔒 Sélectionne simplement la bonne catégorie : un salon privé sera créé automatiquement."
              )
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## 📂 CATÉGORIE BOUTIQUE\n" +
                "Choisis le type de demande qui correspond le mieux à ton besoin."
              )
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(menu)
            );

          if (BANNER_BOUTIQUE) {
            container.addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                  .setURL(BANNER_BOUTIQUE)
                  .setDescription("Boutique Los Santos Reborn")
              )
            );
          }

          container
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## ⚠️ AVANT D'OUVRIR TON TICKET\n" +
                "• Explique précisément ce que tu souhaites\n" +
                "• Ajoute les informations utiles à ta demande\n" +
                "• Évite d'ouvrir plusieurs tickets pour la même chose\n" +
                "• Reste patient et respecte l'équipe\n\n" +
                "*Un membre de l'équipe te répondra dès que possible.*"
              ),
              new TextDisplayBuilder().setContent(
                "### 🟧 Los Santos Reborn • Boutique\nMerci pour ton soutien."
              )
            );

          await interaction.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });

          return interaction.editReply("✅ Panneau boutique publié.");
        }

        const embed = new EmbedBuilder()
          .setColor(ORANGE)
          .setAuthor({ name: "Los Santos Reborn • Boutique", iconURL: LOGO })
          .setTitle("🛒 Boutique Los Santos Reborn")
          .setDescription(
            "### ❓ Besoin d'aide ?\n" +
            "> Ouvre un ticket boutique pour contacter notre équipe.\n\n" +
            "### 📂 Catégorie\n" +
            "> Sélectionne le type de demande dans le menu ci-dessous.\n" +
            "> Un salon privé sera créé automatiquement.\n\n" +
            "### ⚠️ Important\n" +
            "> • Explique précisément ta demande\n" +
            "> • Ajoute les informations utiles\n" +
            "> • N'ouvre pas plusieurs tickets pour la même demande\n" +
            "> • Respecte l'équipe"
          )
          .setFooter({ text: "Los Santos Reborn • Boutique", iconURL: LOGO })
          .setTimestamp();

        if (BANNER_BOUTIQUE) embed.setImage(BANNER_BOUTIQUE);

        await interaction.channel.send({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(menu)]
        });

        return interaction.editReply("✅ Panneau boutique publié.");
      }

      if (command === "patchnote") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        const version = interaction.options.getString("version", true).trim();
        const nouveautes = interaction.options.getString("nouveautes", true).trim();
        const ameliorations = interaction.options.getString("ameliorations")?.trim() || "";
        const corrections = interaction.options.getString("corrections")?.trim() || "";
        const date = new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        }).format(new Date());

        const cleanList = text => text
          .split(/\n|\s*;\s*/g)
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => line.replace(/^[-•✅🟢]+\s*/, ""));

        const asBullets = text => cleanList(text).map(line => `• ${line}`).join("\n");

        if (
          ContainerBuilder &&
          TextDisplayBuilder &&
          SeparatorBuilder &&
          MediaGalleryBuilder &&
          MediaGalleryItemBuilder &&
          MessageFlags?.IsComponentsV2
        ) {
          const container = new ContainerBuilder()
            .setAccentColor(GREEN)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${REGLEMENT_ROLE_ID ? `<@&${REGLEMENT_ROLE_ID}>\n` : ""}` +
                `# 🟢 PATCHNOTE • LOS SANTOS REBORN\n` +
                `## Version **${version}**  •  ${date}\n` +
                "Toutes les nouveautés, améliorations et corrections du serveur."
              )
            );

          if (BANNER_PATCHNOTE) {
            container.addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            );
            container.addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                  .setURL(BANNER_PATCHNOTE)
                  .setDescription(`Patchnote Los Santos Reborn ${version}`)
              )
            );
          }

          container
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## ✨ NOUVEAUTÉS\n" + asBullets(nouveautes)
              )
            );

          if (ameliorations) {
            container
              .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "## 🚀 AMÉLIORATIONS\n" + asBullets(ameliorations)
                )
              );
          }

          if (corrections) {
            container
              .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "## 🛠️ CORRECTIONS\n" + asBullets(corrections)
                )
              );
          }

          container
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "### 💬 TON AVIS COMPTE\n" +
                "Si tu rencontres un problème après la mise à jour, ouvre un ticket et donne-nous un maximum d'informations.\n\n" +
                "### 💚 Los Santos Reborn\nMerci de faire vivre le serveur avec nous."
              )
            );

          await interaction.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: REGLEMENT_ROLE_ID ? { roles: [REGLEMENT_ROLE_ID] } : undefined
          });

          return interaction.editReply(`✅ Patchnote ${version} publiée.`);
        }

        const sections = [
          `## ✨ Nouveautés\n${asBullets(nouveautes)}`,
          ameliorations ? `## 🚀 Améliorations\n${asBullets(ameliorations)}` : "",
          corrections ? `## 🛠️ Corrections\n${asBullets(corrections)}` : ""
        ].filter(Boolean).join("\n\n");

        const embed = new EmbedBuilder()
          .setColor(GREEN)
          .setAuthor({ name: "Los Santos Reborn • Patchnote", iconURL: LOGO })
          .setTitle(`🟢 Version ${version}`)
          .setDescription(`${sections}\n\n💬 **Ton avis compte** — signale tout problème via un ticket.`)
          .setFooter({ text: `Los Santos Reborn • ${date}`, iconURL: LOGO })
          .setTimestamp();

        if (BANNER_PATCHNOTE) embed.setImage(BANNER_PATCHNOTE);

        await interaction.channel.send({
          content: REGLEMENT_ROLE_ID ? `<@&${REGLEMENT_ROLE_ID}>` : undefined,
          embeds: [embed],
          allowedMentions: REGLEMENT_ROLE_ID ? { roles: [REGLEMENT_ROLE_ID] } : undefined
        });

        return interaction.editReply(`✅ Patchnote ${version} publiée.`);
      }

      if (command === "annonce") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const photo = interaction.options.getAttachment("photo");

        if (photo && !photo.contentType?.startsWith("image/")) {
          return interaction.reply({
            content: "❌ Le fichier `photo` doit être une image.",
            flags: 64
          });
        }

        pendingAnnouncements.set(interaction.user.id, {
          channelId: interaction.channelId,
          imageUrl: photo?.url || null,
          createdAt: Date.now()
        });

        const menu = new StringSelectMenuBuilder()
          .setCustomId("annonce_type_menu")
          .setPlaceholder("Choisis le type d'annonce...")
          .addOptions(
            {
              label: "Annonce Globale",
              description: "Annonce officielle destinée à tout le serveur",
              value: "global",
              emoji: "📢"
            },
            {
              label: "Événement",
              description: "Annonce avec date, heure et lieu",
              value: "evenement",
              emoji: "🎉"
            },
            {
              label: "Annonce Légale",
              description: "Annonce destinée au secteur légal",
              value: "legal",
              emoji: "🛡️"
            },
            {
              label: "Annonce Illégale",
              description: "Annonce destinée au secteur illégal",
              value: "illegal",
              emoji: "🔴"
            }
          );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
          content:
            "## 📣 Création d'une annonce\n" +
            "Choisis la catégorie. Un formulaire adapté va ensuite s'ouvrir." +
            (photo ? "\\n🖼️ **Photo ajoutée :** elle sera intégrée à l'annonce." : ""),
          components: [row],
          flags: 64
        });
      }

      if (command === "entreprises") {
        const data = readEntreprises();
        const embeds = data.length
          ? data.map(e => {
              const embed = new EmbedBuilder()
                .setColor(ORANGE)
                .setTitle(`🏢 ${e.nom}`)
                .addFields(
                  { name: "👨‍💼 Patron", value: e.patron || "Aucun", inline: true },
                  { name: "📌 Statut", value: e.statut || "Inconnu", inline: true },
                  { name: "📈 Recrutement", value: e.recrutement || "Fermé", inline: true }
                )
                .setTimestamp();
              if (e.logo) embed.setThumbnail(e.logo);
              return embed;
            })
          : [
              new EmbedBuilder()
                .setColor(ORANGE)
                .setTitle("📊 Tableau des entreprises")
                .setDescription("Aucune entreprise enregistrée.")
                .setThumbnail(LOGO)
                .setTimestamp()
            ];

        await interaction.deferReply({ flags: 64 });
        for (let i = 0; i < embeds.length; i += 10) {
          await interaction.channel.send({ embeds: embeds.slice(i, i + 10) });
        }
        return interaction.editReply("✅ Liste des entreprises publiée.");
      }

      if (command === "majentreprises") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }
        await updateEntreprisesChannel(interaction.guild);
        return interaction.reply({ content: "✅ Salon entreprises mis à jour.", flags: 64 });
      }

      if (command === "entreprise-set") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const nom = interaction.options.getString("nom", true).trim();
        const patron = interaction.options.getString("patron", true).trim();
        const statut = interaction.options.getString("statut", true).trim();
        const recrutement = interaction.options.getString("recrutement", true).trim();
        const logo = interaction.options.getString("logo")?.trim() || "";

        const data = readEntreprises();
        const index = data.findIndex(e => e.nom.toLowerCase() === nom.toLowerCase());

        if (index >= 0) {
          data[index] = { nom, patron, statut, recrutement, logo: logo || data[index].logo || "" };
        } else {
          data.push({ nom, patron, statut, recrutement, logo });
        }

        saveEntreprises(data);
        await updateEntreprisesChannel(interaction.guild);
        return interaction.reply({ content: `✅ Entreprise **${nom}** mise à jour.`, flags: 64 });
      }

      if (command === "entreprise-remove") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const nom = interaction.options.getString("nom", true).trim();
        const data = readEntreprises().filter(e => e.nom.toLowerCase() !== nom.toLowerCase());
        saveEntreprises(data);
        await updateEntreprisesChannel(interaction.guild);
        return interaction.reply({ content: `✅ Entreprise **${nom}** supprimée.`, flags: 64 });
      }

      if (command === "patron-add") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        const entreprise = interaction.options.getString("entreprise", true);
        if (PATRON_ROLE_ID) await member.roles.add(PATRON_ROLE_ID).catch(() => {});
        return interaction.reply({ content: `✅ ${member} est maintenant patron de **${entreprise}**.`, flags: 64 });
      }

      if (command === "patron-remove") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        if (PATRON_ROLE_ID) await member.roles.remove(PATRON_ROLE_ID).catch(() => {});
        return interaction.reply({ content: `✅ Rôle patron retiré à ${member}.`, flags: 64 });
      }

      if (command === "casier") {
        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        const data = readCasiers();
        const casier = data[member.id] || [];
        const description = casier.length
          ? casier.map((c, i) => `**${i + 1}.** ${c.type} | ${c.reason}\n👮 ${c.staff} | 📅 ${c.date}`).join("\n\n")
          : "Aucune sanction enregistrée.";

        const embed = new EmbedBuilder()
          .setColor(ORANGE)
          .setTitle(`🚓 Casier de ${member.user.tag}`)
          .setDescription(description.slice(0, 4096))
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await interaction.deferReply({ flags: 64 });
        await interaction.channel.send({ embeds: [embed] });
        return interaction.editReply("✅ Casier publié.");
      }

      if (command === "casier-add") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        const type = interaction.options.getString("sanction", true);
        const reason = interaction.options.getString("raison", true);
        const data = readCasiers();
        if (!data[member.id]) data[member.id] = [];

        data[member.id].push({
          type,
          reason,
          staff: interaction.user.tag,
          date: new Date().toLocaleString("fr-FR")
        });
        saveCasiers(data);

        const embed = new EmbedBuilder()
          .setColor(ORANGE)
          .setTitle("🚓 Casier mis à jour")
          .addFields(
            { name: "👤 Joueur", value: member.user.tag, inline: true },
            { name: "📌 Sanction", value: type, inline: true },
            { name: "📝 Raison", value: reason },
            { name: "👮 Staff", value: interaction.user.tag, inline: true }
          )
          .setTimestamp();

        sendLog(interaction.guild, CASIER_LOG_CHANNEL_ID || LOG_MODERATION_CHANNEL_ID, embed);
        return interaction.reply({ content: `✅ Casier de ${member} mis à jour.`, flags: 64 });
      }

      if (command === "casier-clear") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        const data = readCasiers();
        delete data[member.id];
        saveCasiers(data);
        return interaction.reply({ content: `✅ Casier de ${member} supprimé.`, flags: 64 });
      }

      if (command === "warn") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        const reason = interaction.options.getString("raison") || "Aucune raison";

        const log = new EmbedBuilder()
          .setColor(ORANGE)
          .setTitle("⚠️ Warn")
          .addFields(
            { name: "👤 Joueur", value: member.user.tag, inline: true },
            { name: "👮 Staff", value: interaction.user.tag, inline: true },
            { name: "📝 Raison", value: reason }
          )
          .setTimestamp();

        sendLog(interaction.guild, LOG_MODERATION_CHANNEL_ID, log);
        return interaction.reply({ content: `✅ ${member} a reçu un warn.`, flags: 64 });
      }

      if (command === "kick") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        const reason = interaction.options.getString("raison") || "Aucune raison";

        if (!member.kickable) {
          return interaction.reply({ content: "❌ Je ne peux pas expulser ce membre. Vérifie la hiérarchie des rôles.", flags: 64 });
        }

        await member.kick(reason);
        const log = new EmbedBuilder()
          .setColor(RED)
          .setTitle("👢 Kick")
          .addFields(
            { name: "👤 Joueur", value: user.tag, inline: true },
            { name: "👮 Staff", value: interaction.user.tag, inline: true },
            { name: "📝 Raison", value: reason }
          )
          .setTimestamp();

        sendLog(interaction.guild, LOG_MODERATION_CHANNEL_ID, log);
        return interaction.reply({ content: `✅ ${user.tag} a été kick.`, flags: 64 });
      }

      if (command === "ban") {
        if (!hasStaff(interaction.member)) {
          return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
        }

        const user = interaction.options.getUser("membre", true);
        const member = await interaction.guild.members.fetch(user.id);
        const reason = interaction.options.getString("raison") || "Aucune raison";

        if (!member.bannable) {
          return interaction.reply({ content: "❌ Je ne peux pas bannir ce membre. Vérifie la hiérarchie des rôles.", flags: 64 });
        }

        await member.ban({ reason });
        const log = new EmbedBuilder()
          .setColor(RED)
          .setTitle("🔨 Ban")
          .addFields(
            { name: "👤 Joueur", value: user.tag, inline: true },
            { name: "👮 Staff", value: interaction.user.tag, inline: true },
            { name: "📝 Raison", value: reason }
          )
          .setTimestamp();

        sendLog(interaction.guild, LOG_MODERATION_CHANNEL_ID, log);
        return interaction.reply({ content: `✅ ${user.tag} a été banni.`, flags: 64 });
      }
    }

    if (interaction.isButton() && interaction.customId === "accept_reglement") {
      return interaction.reply({
        content: "📜 Règlement accepté. Complète maintenant ton identité RP pour obtenir l'accès au serveur.",
        flags: 64
      });
    }

    if (interaction.isButton() && interaction.customId === "identity_panel") {
      if (interaction.member.roles.cache.has(REGLEMENT_ROLE_ID)) {
  return interaction.reply({
    content: "❌ Tu as déjà validé ton identité RP.",
    flags: 64
  });
}
      const modal = new ModalBuilder()
        .setCustomId("identity_modal")
        .setTitle("Identité RP Los Santos Reborn");

      const prenomInput = new TextInputBuilder()
        .setCustomId("prenom_rp")
        .setLabel("Prénom RP")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const nomInput = new TextInputBuilder()
        .setCustomId("nom_rp")
        .setLabel("Nom RP")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const ageInput = new TextInputBuilder()
        .setCustomId("age_irl")
        .setLabel("Âge IRL")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(prenomInput),
        new ActionRowBuilder().addComponents(nomInput),
        new ActionRowBuilder().addComponents(ageInput)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "identity_modal") {
      if (interaction.member.roles.cache.has(REGLEMENT_ROLE_ID)) {
  return interaction.reply({
    content: "❌ Tu as déjà validé ton identité RP.",
    flags: 64
  });
}
      const prenom = interaction.fields.getTextInputValue("prenom_rp").trim();
      const nom = interaction.fields.getTextInputValue("nom_rp").trim();
      const age = interaction.fields.getTextInputValue("age_irl").trim();

      if (!prenom || !nom || !age || prenom.length < 2 || nom.length < 2 || !/^\d{1,2}$/.test(age)) {
        return interaction.reply({
          content: "❌ Identité invalide. Tu dois remplir Prénom RP, Nom RP et Âge IRL correctement.",
          flags: 64
        });
      }

      const nouveauPseudo = `${prenom} ${nom}`;
      let pseudoChange = true;

      if (interaction.member.id === interaction.guild.ownerId) {
        pseudoChange = false;
      } else {
        await interaction.member.setNickname(nouveauPseudo).catch(() => {
          pseudoChange = false;
        });
      }

      await interaction.member.roles.add(REGLEMENT_ROLE_ID);

      const logIdentite = new EmbedBuilder()
        .setColor(ORANGE)
        .setTitle("🪪 Nouvelle identité RP")
        .addFields(
          { name: "👤 Discord", value: `${interaction.user.tag}`, inline: true },
          { name: "🆔 ID", value: interaction.user.id, inline: true },
          { name: "📛 Nom RP", value: nouveauPseudo, inline: true },
          { name: "🎂 Âge IRL", value: `${age} ans`, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      sendLog(interaction.guild, LOG_IDENTITE_CHANNEL_ID, logIdentite);

      const embed = new EmbedBuilder()
        .setColor(ORANGE)
        .setTitle("✅ Identité enregistrée")
        .setDescription(
          `🪪 Nom RP : **${nouveauPseudo}**\n` +
          `🎂 Âge IRL : **${age} ans**\n` +
          `🔓 Accès serveur accordé.` +
          (pseudoChange ? "" : "\n⚠️ Je n'ai pas pu modifier ton pseudo automatiquement.")
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        flags: 64
      });
    }

    // =========================
    // CRÉATION D'ANNONCE
    // =========================
    if (interaction.isStringSelectMenu() && interaction.customId === "annonce_type_menu") {
      if (!hasStaff(interaction.member)) {
        return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
      }

      const type = interaction.values[0];
      return interaction.showModal(buildAnnouncementModal(type));
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("annonce_modal:")) {
      if (!hasStaff(interaction.member)) {
        return interaction.reply({ content: "❌ Permission refusée.", flags: 64 });
      }

      const type = interaction.customId.split(":")[1] || "global";
      const style = getAnnouncementStyle(type);
      const pending = pendingAnnouncements.get(interaction.user.id);

      const titre = interaction.fields.getTextInputValue("annonce_titre").trim();
      const description = interaction.fields.getTextInputValue("annonce_description").trim();
      const date = interaction.fields.getTextInputValue("annonce_date").trim();
      const heure = interaction.fields.getTextInputValue("annonce_heure").trim();
      const lieu = interaction.fields.getTextInputValue("annonce_lieu").trim();

      const embed = new EmbedBuilder()
        .setColor(style.color)
        .setAuthor({ name: `Los Santos Reborn • ${style.label}`, iconURL: LOGO })
        .setTitle(`${style.emoji} ${titre}`)
        .setDescription(description)
        .setThumbnail(LOGO)
        .setTimestamp();

      const fields = [];
      if (date) fields.push({ name: "📅 Date", value: date, inline: true });
      if (heure) fields.push({ name: "🕒 Heure", value: heure, inline: true });
      if (lieu) fields.push({ name: "📍 Lieu / Information", value: lieu, inline: false });
      if (fields.length) embed.addFields(fields);

      // Priorité à la photo fournie dans /annonce, sinon bannière d'annonce configurée.
      if (pending?.imageUrl) {
        embed.setImage(pending.imageUrl);
      } else if (BANNER_ANNONCE) {
        embed.setImage(BANNER_ANNONCE);
      }

      const targetChannel =
        pending?.channelId && interaction.guild.channels.cache.get(pending.channelId)
          ? interaction.guild.channels.cache.get(pending.channelId)
          : interaction.channel;

      await targetChannel.send({
        content:
          `# ${style.emoji} ${style.title} • LOS SANTOS REBORN\n` +
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
          (REGLEMENT_ROLE_ID ? `<@&${REGLEMENT_ROLE_ID}>` : ""),
        embeds: [embed],
        allowedMentions: REGLEMENT_ROLE_ID ? { roles: [REGLEMENT_ROLE_ID] } : undefined
      });

      pendingAnnouncements.delete(interaction.user.id);

      return interaction.reply({
        content: `✅ ${style.label} publiée avec succès.`,
        flags: 64
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {
      const type = interaction.values[0];

      if (type === "entreprise") {
        const modal = new ModalBuilder()
          .setCustomId("entreprise_modal")
          .setTitle("Candidature Entreprise");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("entreprise_nom")
              .setLabel("Nom de l'entreprise voulue")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("entreprise_rp")
              .setLabel("Nom Prénom RP")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("entreprise_motivation")
              .setLabel("Motivation")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("entreprise_experience")
              .setLabel("Expérience RP")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      return createTicket(interaction, ticketTypes[type]);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "boutique_menu") {
      const choix = interaction.values[0];

      const boutiqueTypes = {
        vip: ticketTypes.vip,
        donation: ticketTypes.dons,
        boutique: ticketTypes.boutique
      };

      const selectedTicket = boutiqueTypes[choix] || ticketTypes.boutique;

      return createTicket(
        interaction,
        selectedTicket,
        `\n\n🛒 **Type de demande boutique :** ${selectedTicket.label}`
      );
    }

    if (interaction.isModalSubmit() && interaction.customId === "entreprise_modal") {
      const entreprise = interaction.fields.getTextInputValue("entreprise_nom");
      const nomrp = interaction.fields.getTextInputValue("entreprise_rp");
      const motivation = interaction.fields.getTextInputValue("entreprise_motivation");
      const experience = interaction.fields.getTextInputValue("entreprise_experience");

      const extra =
        `\n\n🏢 **Entreprise voulue :** ${entreprise}\n` +
        `🪪 **Nom RP :** ${nomrp}\n` +
        `📄 **Motivation :** ${motivation}\n` +
        `🎭 **Expérience RP :** ${experience}`;

      return createTicket(interaction, ticketTypes.entreprise, extra);
    }

    if (interaction.isButton() && interaction.customId === "close_ticket") {
      const log = new EmbedBuilder()
        .setColor(RED)
        .setTitle("🔒 Ticket fermé")
        .addFields(
          { name: "📄 Salon", value: interaction.channel.name },
          { name: "👮 Fermé par", value: `${interaction.user.tag}` }
        )
        .setTimestamp();

      sendLog(interaction.guild, LOG_TICKET_CHANNEL_ID, log);

      await interaction.reply({
        content: "🔒 Fermeture du ticket dans 5 secondes..."
      });

      setTimeout(() => {
        interaction.channel.delete().catch(console.error);
      }, 5000);

      return;
    }
  } catch (error) {
    console.error("❌ ERREUR COMPLETE :");
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Erreur : vérifie les permissions du bot ou ton fichier `.env`.",
        flags: 64
      });
    }
  }
});

client.login(TOKEN);