# Los Santos Reborn

Site du serveur RP : accueil avec organigramme, tickets liés au bot Discord, whitelist, casiers staff et règlement.
Hébergé sur **Vercel**, données dans **Supabase**, code sur **GitHub**.

## Mise en ligne (une seule fois)

### 1. Supabase (la base de données)
1. Sur [supabase.com](https://supabase.com), crée un projet (région Europe, mot de passe au choix).
2. Menu **SQL Editor** → **New query** → colle tout le fichier `supabase.sql` → **Run**.
3. (Pour garder tes tickets, demandes WL et casiers actuels) fais pareil avec `import-donnees.sql`.
   Ce fichier reste sur ton PC, il n'est pas envoyé sur GitHub.
4. Menu **Project Settings → API Keys** : note l'URL du projet et la **Secret key** (`sb_secret_…`).

### 2. GitHub (le code)
1. Crée un dépôt **privé** sur [github.com/new](https://github.com/new), par exemple `los-santos-reborn`.
2. Dans le dossier du site :
   ```bash
   git init
   git add .
   git commit -m "Site Los Santos Reborn"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/los-santos-reborn.git
   git push -u origin main
   ```
   Le `.gitignore` empêche d'envoyer `.env`, `node_modules`, `import-donnees.sql` et les sauvegardes.

### 3. Vercel (le site en ligne)
1. Sur [vercel.com/new](https://vercel.com/new), importe le dépôt GitHub. Vercel reconnaît Express tout seul : ne change aucun réglage de build.
2. Avant **Deploy**, ouvre **Environment Variables** et ajoute les variables de `.env.example` :

   | Variable | Valeur |
   |---|---|
   | `SUPABASE_URL` | l'URL du projet Supabase |
   | `SUPABASE_SECRET_KEY` | la Secret key `sb_secret_…` |
   | `SESSION_SECRET` | une longue phrase au hasard |
   | `STAFF_PASSWORD_FONDATEUR` … `STAFF_PASSWORD_HELPER` | un mot de passe par grade |
   | `DISCORD_BOT_TOKEN` | le token du bot (régénère-le avant) |
   | `DISCORD_GUILD_ID` | l'ID de ton serveur Discord |

3. **Deploy**. Ensuite, chaque `git push` remet le site à jour tout seul.

Si tu changes une variable sur Vercel : **Deployments → … → Redeploy** pour qu'elle soit prise en compte.

## En local
```bash
npm install
cp .env.example .env   # puis remplis-le
npm start              # http://localhost:5173
```

## Organisation
- `server.js` : le serveur (API, pages, Supabase, Discord)
- `pages/` : le contenu de chaque page (`_layout.html` = en-tête commun)
- `public/` : CSS, JS et logo
- `supabase.sql` : création de la base + règlement et équipe de départ
