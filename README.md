# ISAMARKET

Site de pronostics pour une classe, en français. Chaque membre reçoit une dotation initiale de 1 000 Squids, monnaie fictive sans achat, retrait ou conversion. Le bonus de 1 000 Squids par jour de visite connectée est protégé côté serveur, une fois par jour à Paris, sans crédit pour les jours d'absence.

## Application

- Connexion, inscription libre avec confirmation d’e-mail et récupération du mot de passe.
- Marchés Oui/Non, recherche, catégories, filtres, création limitée à un sujet par jour à Paris.
- Cagnotte commune, simulation incluant la nouvelle mise, cotes et historique via Supabase Realtime.
- Paris personnels, profil, avatar par URL, classement par bénéfice net réalisé.
- Administration : suspension des membres, clôture, règlement, annulation et signalements.
- Règles serveur : solde et quota protégés en concurrence, identifiants de mise uniques, paiements atomiques, distribution des arrondis aux plus grands restes, remboursement en l’absence de gagnant.

## Développement

Node.js 22.13 ou supérieur, puis :

```sh
npm ci
npm run dev
```

L’aperçu utilise le projet Supabase ISAMarket configuré dans `lib/supabase.ts`. La clé présente dans ce fichier est une clé publique destinée au navigateur. Ne jamais y ajouter une clé `service_role`, un secret ou un mot de passe de base de données.

```sh
npx tsc --noEmit
npm run build
npm start
```

Le starter Vinext/React/TypeScript et ses composants sont conservés. Le build produit un Worker Cloudflare et les ressources statiques sous `dist/`. La publication du site est gérée par Netlify depuis le dépôt GitHub `julesmoreau62/IsaMarket`. Le fichier `.openai/hosting.json` est une configuration historique ; ne pas lancer de publication Sites pour ce projet.

## Base de données

Le projet Supabase existant est `xdjitzgqjsgcupwwipzz`. Le schéma initial et la correction de sécurité sont déjà appliqués. Ne pas rejouer ces fichiers sur ce projet.

Pour une nouvelle base vide uniquement, appliquer dans l’ordre :

1. `supabase/isamarket.sql`
2. `supabase/hardening.sql`

L’administrateur applicatif est `tanguypavat8@gmail.com`, après confirmation de cet e-mail. Les rôles ne proviennent jamais des métadonnées modifiables d’un profil. Toutes les tables exposées ont des politiques d’accès ; les opérations privilégiées sont contrôlées dans des fonctions privées.

## Première ouverture à la classe

1. Dans Supabase Authentication > URL Configuration, renseigner l’adresse publiée comme Site URL et URL de redirection autorisée.
2. Dans Authentication > Emails, vérifier le service SMTP, les limites et les modèles de confirmation/récupération pour permettre les e-mails aux camarades.
3. Garder le Site privé et autoriser l’administrateur ainsi que les camarades dans son partage.
4. Chaque membre crée son compte, confirme son e-mail et reçoit ses 1 000 Squids une seule fois.

## Vérification

Voir `AUDIT-2026-10-05.md` pour les bugs des combinés, le bonus quotidien et le bot. La migration `20261005070250_fix_combined_stakes_cancellation_and_daily_login_rewards` est installée et les trois suites SQL passent sur le serveur. L'interface et le bot sont publiés via GitHub ; Netlify gère la mise en ligne du site. Les anciens fichiers de schéma décrivent le fonctionnement historique ; ne pas les rejouer sur la base actuelle à résultats multiples et cotes fixes.

Voir `VERIFICATION.md` pour les résultats réellement obtenus et les vérifications qui nécessitent encore un compte confirmé. La suite `supabase/verify.sql` annule entièrement ses données de test. `scripts/verify-concurrency.mjs` exécute les essais simultanés dans une base PostgreSQL locale isolée, sans modifier Supabase.
