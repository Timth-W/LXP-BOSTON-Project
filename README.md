# JoyTo — prototype

> *Cultivating connection and daily sharing.*
> JoyTo aide les personnes âgées isolées à trouver des activités près de chez elles, à rencontrer des personnes qui partagent leurs goûts et, si besoin, à réserver un accompagnant (25 € TTC de l'heure, payé après la sortie).

Application Next.js complète, en **anglais par défaut avec bascule français**, responsive (téléphone, tablette, ordinateur), avec trois espaces : **Senior**, **Accompagnant** et **Famille**.

**Fonctionnalité phare : Joy**, l'assistante vocale. On touche « Talk with Joy » et Joy prend la parole : « Hello Marie! What would you like to do this week? You have Tea and crosswords tomorrow at 5 pm. Would you like to join the garden workshop on Saturday, with Jeanne and André? Or would you like someone to go with you? » Chaque proposition s'affiche en carte ; un toucher (ou un « oui » à Joy) ouvre la confirmation, et seul le bouton vert réserve.

---

## 1. Lancer le projet (5 minutes)

Prérequis : [Node.js 20 ou plus](https://nodejs.org) et [VS Code](https://code.visualstudio.com).

1. Décompressez `joyto-app.zip`.
2. Dans VS Code : **Fichier → Ouvrir le dossier…** → choisissez le dossier `joyto`.
3. Ouvrez le terminal : **Terminal → Nouveau terminal**, puis :

```bash
npm install
npm run dev
```

4. Ouvrez http://localhost:3000.

Commandes utiles :

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement (rechargement automatique) |
| `npm run typecheck` | vérifie les types TypeScript |
| `npm test` | tests automatiques (prix, rattachement famille, cycle d'une sortie…) |
| `npm run check` | les trois vérifications d'un coup : types, tests, build |
| `npm run format` | remet le code en forme (Prettier) |

## 2. Comptes et démo

- **Mode démo** (pour le jury et pour vous) : sur la page d'accueil, section *Try the demo*, cliquez un profil pour entrer sans mot de passe.
- **Vrais comptes** : *Create an account* → choix du rôle → formulaire. Connexion ensuite par e-mail et mot de passe.
- Tous les comptes de démo ont le mot de passe **`demo1234`** (ex. `marie@demo.joyto.app`).

| Profil | Rôle | À montrer |
| --- | --- | --- |
| Marie | Senior | Joy (rappel de demain 17 h, propositions, oui par la voix puis toucher), carte des activités, code d'invitation `JOY-4821` |
| Karim, Léa, Tom | Accompagnants | Joy propose les missions, adresse masquée puis débloquée, revenus |
| Sophie | Famille (fille de Marie) | Joy propose d'organiser une sortie pour Marie, alerte d'isolement, carte cadeau, paiements |

**Rattacher un proche à un senior** : le senior trouve son code dans *Profile → My family* (ex. `JOY-4821`). Le proche le saisit à l'inscription (rôle *Family*) ou plus tard dans son profil, en précisant le lien (fils, fille, petit-enfant…). Les deux côtés peuvent retirer le lien.

**Horloge de démo** (menu avatar en haut à droite) : passe de jeudi matin à dimanche soir pour montrer la fin d'une sortie, le paiement et l'avis.

**Réinitialiser** : menu avatar → *Reset demo data*. Les données de démo sont gardées dans le navigateur (localStorage).

## 3. Joy et l'IA

**Joy, la voix (GPT Realtime 2.1)**

- Code : `src/components/joy/` (écran, moteur vocal, fiche de confirmation), `src/lib/joy/` (propositions, phrases, configuration Realtime), route `src/app/api/joy/session/route.ts`.
- Joy ne parle que sur demande (bouton « Talk with Joy » sur chaque accueil et onglet Joy). Les navigateurs n'autorisent le son qu'après un toucher : c'est ce bouton qui lance la voix.
- **Sans clé OpenAI (mode démo)** : voix et micro du navigateur. Joy lit le message d'accueil, comprend « oui », « non », « au revoir » et les mots des propositions ; une demande libre (« j'aimerais chanter ») passe par l'IA texte ci-dessous. Si le micro n'est pas disponible, on peut écrire.
- **Avec une clé** : copiez `.env.example` en `.env.local` et renseignez `OPENAI_API_KEY`. Le serveur crée une clé temporaire (10 min) via `POST /v1/realtime/client_secrets` avec le modèle `gpt-realtime-2.1`, la voix, les consignes et les outils ; le navigateur se connecte ensuite directement à OpenAI en WebRTC. La clé OpenAI ne quitte jamais le serveur.
- Outils donnés au modèle : `show_proposal` (met une carte en avant), `open_confirmation` (ouvre la fiche, sans rien réserver), `find_activities` (cherche d'autres activités réelles), `end_conversation`.
- Règle de sécurité : rien n'est réservé ni payé par la voix. La fiche de confirmation affiche le prix et il faut toucher le bouton vert. Joy ne propose que ce que l'application lui donne (pas d'activité inventée) et ne reçoit ni nom de famille ni adresse.
- Coût indicatif : quelques centimes par minute de conversation (tarif audio du modèle sur la page OpenAI du modèle).
- Ce mode n'a pas pu être testé ici sans clé : à vérifier dès que vous en avez une (si la connexion échoue, Joy repasse automatiquement en voix de démo).

**L'IA texte (compréhension des demandes libres)**

- Route `src/app/api/assistant/route.ts`, utilisée par Joy en mode démo pour les demandes libres des seniors. Avec `ANTHROPIC_API_KEY`, un modèle de langage choisit parmi les activités possibles ; sinon, des règles simples.
- Garde-fous : le code filtre d'abord les activités possibles (date, places, déjà inscrit) ; l'IA ne peut citer que ces activités (`src/lib/ai/sanitize.ts`) ; la réponse est validée par zod (`schema.ts`).

## 4. Organisation du code

```
src/
  app/                 écrans (une page = un dossier)
    page.tsx           accueil + choix du profil de démo
    login/ signup/     connexion et création de compte
    senior/            accueil, joy, activités (liste + carte), sorties, profil
    companion/         missions, joy, détail (adresse débloquée), revenus, profil
    family/            accueil, joy, réserver, sortie, paiements, profil (proches)
    notifications/     notifications (tous rôles)
    api/joy/session/   clé temporaire GPT Realtime pour Joy
    api/assistant/     IA texte (demandes libres)
    globals.css        direction artistique (couleurs, typo, composants)
  components/          briques d'interface (AppShell, ActivityCard, BookingForm…)
    joy/               Joy : écran, moteur vocal (Realtime ou démo), fiche de confirmation
  i18n/                en.ts (référence), fr.ts, index.tsx (useI18n)
  lib/
    types.ts           modèle de données
    seed.ts            données de démo
    actions.ts         règles métier (inscription, réservation, paiement, liens famille…)
    selectors.ts       données calculées (statuts, places restantes, confidentialité…)
    matching.ts        filtres obligatoires et classement
    joy/               propositions de Joy, phrases parlées, configuration GPT Realtime
    pricing.ts         prix : 1 h minimum puis au quart d'heure, 70 % pour l'accompagnant
    store.tsx          magasin de données du prototype (à remplacer par la base)
    auth.ts            aide à l'authentification de démo
db/schema.sql          le même modèle en tables PostgreSQL (Supabase)
AGENTS.md              consignes pour Codex et autres assistants de code
```

**Ajouter un texte** : ajoutez la clé dans `src/i18n/en.ts`, puis dans `fr.ts`. Si vous oubliez le français, `npm run typecheck` le signale.

## 5. Travailler avec Codex

Le fichier `AGENTS.md` donne à Codex les règles du projet (où mettre la logique, comment traduire, quoi vérifier). Exemples de demandes :

- « Ajoute à Joy une proposition de rappel quand une sortie a été annulée. »
- « Ajoute une catégorie d'activité *Lecture* avec son icône, en anglais et en français. »
- « Remplace le magasin localStorage par Supabase en suivant la section 6 du README. »
- « Ajoute un test pour l'annulation par l'accompagnant. »

Demandez-lui toujours de finir par `npm run check`.

## 6. Passer à une vraie base de données

Le prototype est construit pour que ce passage touche peu de fichiers : les écrans lisent les données via `selectors.ts` et les modifient via `actions.ts`.

1. Créez un projet [Supabase](https://supabase.com) (PostgreSQL + authentification).
2. Exécutez `db/schema.sql` dans l'éditeur SQL de Supabase, puis ajoutez les politiques de sécurité (RLS) sur chaque table, sur le modèle donné en fin de fichier.
3. **Authentification** : remplacez `signUp` / `login` / `logout` et `src/lib/auth.ts` par Supabase Auth (`supabase.auth.signUp`, `signInWithPassword`). Les mots de passe ne doivent jamais être hachés ni comparés dans le navigateur.
4. **Actions** : transformez chaque fonction de `actions.ts` en *server action* ou route API qui écrit dans la base (même logique, mêmes vérifications).
5. **Lecture** : remplacez `useStore()` par des requêtes (par exemple avec TanStack Query) ; gardez les fonctions de `selectors.ts` pour les calculs.
6. **Confidentialité** : la règle « adresse visible seulement par l'accompagnant accepté » doit être appliquée par la base (vue `missions_for_companions` + RLS), pas seulement par l'écran.
7. **Paiement** : brancher Stripe (pré-autorisation à la réservation, capture après la sortie, remboursement à l'annulation) à la place de la table `payments` simulée.
8. **Carte** : remplacer la carte illustrée (`ActivityMap.tsx`) par MapLibre ou Leaflet avec de vraies coordonnées.

## 7. Limites connues du prototype

- Données et comptes stockés dans le navigateur : chaque navigateur a sa propre démo.
- Paiements simulés, pas de vérification d'identité des accompagnants, pas d'envoi d'e-mails.
- Les messages libres (mots pour l'accompagnant, avis) restent dans la langue où ils ont été écrits.
- Thème clair uniquement, choix volontaire de la direction artistique (fond lin, contraste élevé pour les seniors).
