# Vérifications ISAMARKET — 22 septembre 2026

> Mise à jour : voir [l'audit du 2 octobre 2026](AUDIT-2026-10-02.md). Le serveur actuel utilise plusieurs résultats et des cotes fixes. Les résultats historiques ci-dessous concernent l'ancien schéma et ne certifient pas le fonctionnement actuel.

## Résultats obtenus

- TypeScript : `node node_modules/typescript/bin/tsc --noEmit`, réussi.
- Compilation Vinext : `npm run build`, réussie ; Worker compilé exécuté localement, réponse HTTP 200.
- Supabase réel : `supabase/verify.sql` exécuté dans une transaction entièrement annulée. Aucun compte, sujet, pari ou solde de test conservé.
- Contrôle de sécurité Supabase : aucune alerte. Les index inutilisés signalés à titre informatif sont conservés pour les futures données.
- PostgreSQL local 18.4 : même schéma et mêmes fonctions SQL, avec plusieurs connexions réellement simultanées ; 9 groupes de vérifications réussis.
- Aperçu HTTP local : réponse 200 et affichage du formulaire d’accès privé.
- Écrans d’accès inspectés sur téléphone (390 px) et ordinateur.

## Règles vérifiées dans Supabase

Inscription sans invitation ; e-mail confirmé ; administrateur désigné ; refus de rôle issu des métadonnées utilisateur ; restrictions RLS ; refus des écritures directes de soldes/rôles/résultats ; dotation unique ; quota journalier Europe/Paris ; quota conservé après annulation ; mises strictement entières et positives ; solde insuffisant ; requête répétée ; cotes sans liquidité inventée ; conditions immuables ; clôture côté serveur ; arrondi aux plus grands restes ; conservation des Squids ; règlement idempotent ; remboursement sur annulation ou absence de gagnant ; classement excluant dotation et remboursements ; suspension.

## Concurrence vérifiée localement

1. Deux mises de 800 avec un solde de 1 000 : une seule acceptée.
2. Deux requêtes portant le même identifiant : un seul pari et un seul débit.
3. Deux créations au même instant : un seul sujet et un seul quota.
4. Une mise attend un verrou jusqu’après l’échéance : refusée.
5. Deux règlements simultanés du même sujet : un seul paiement.
6. Deux règlements de sujets différents touchant les mêmes portefeuilles : terminés sans interblocage.
7. Conservation des 5 000 Squids distribués aux cinq comptes locaux de test.
8. Chaque portefeuille correspond exactement à la somme de ses mouvements.

La suite transactionnelle complète est aussi rejouée dans cette base locale. Pour reproduire : installer `embedded-postgres@18.4.0-beta.17` et `pg@8.16.3` dans `.sites-runtime/qa`, puis lancer `node scripts/verify-concurrency.mjs`. La base écoute uniquement sur 127.0.0.1 et s’arrête en fin de test.

## Limites à distinguer des tests réussis

- Aucun e-mail de confirmation ou de récupération n’a été envoyé à un utilisateur réel.
- Les parcours connectés et Supabase Realtime ne sont pas encore validés dans un navigateur avec un compte réel. Leurs fonctions et règles serveur ont été testées ; leur validation complète nécessite la première inscription confirmée.
- Les outils WebMCP sont facultatifs ; leur exécution connectée n’a pas été vérifiée.
- L’URL de redirection Auth et le service d’envoi des e-mails doivent être vérifiés dans les réglages Supabase avant d’ouvrir les inscriptions.
- L’accès privé du Site reste distinct de la création de compte ISAMARKET. Le propriétaire doit aussi autoriser les camarades dans le partage du Site.
