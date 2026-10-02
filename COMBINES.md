# Paris combinés — 2 octobre 2026

Implémentation : `components/isamarket-app.tsx` et `supabase/combined-wagers.sql`.
Migration serveur installée : `20261002073914_add_combined_wagers` dans le projet ISAMarket (`xdjitzgqjsgcupwwipzz`). Le script SQL cible le schéma actuel à résultats multiples et cotes fixes ; il ne doit pas être réappliqué après cette migration.

## Utilisation et règles

Ouvrir un sujet, choisir son résultat et cliquer sur « Ajouter au combiné ». Le bouton « Combiné » de l’en-tête ouvre le panier. Il contient entre 2 et 5 sujets distincts ; choisir un autre résultat du même sujet remplace la sélection. Le panier reste disponible pendant la navigation et se vide après validation ou déconnexion.

Une mise entière et positive est débitée une seule fois. Le serveur valide chaque sujet, les exclusions, les échéances et les cotes affichées. Si une cote a changé, le joueur doit accepter la nouvelle cote. La cote totale est le produit des cotes enregistrées à la validation. Le retour, mise incluse, est arrondi à l’entier inférieur et ne peut pas dépasser 100 000 Squids : une demande au-dessus du plafond est refusée, sans débit.

Le ticket perd dès qu’un résultat est perdant. Il est payé lorsque toutes les sélections non annulées ont gagné. Chaque sélection annulée compte à une cote de 1. Lorsque toutes sont annulées, la mise est remboursée. Un combiné terminé compte comme un seul pari dans le classement ; un remboursement ne compte pas. Les mises encore ouvertes sont incluses dans le montant engagé du profil.

## Fiabilité et vérifications

Tables `combined_wagers` et `combined_wager_legs` avec RLS et lecture réservée aux membres actifs, comme les paris simples existants. Les clients n’ont aucun droit d’écriture directe. Les mutations passent par une RPC authentifiée et une fonction interne de règlement inaccessible aux clients. Le journal des portefeuilles référence les tickets et utilise des clés de mouvement uniques.

La validation est transactionnelle, avec un identifiant de requête conservé lors des tentatives répétées. Le règlement et la création des combinés partagent un verrou transactionnel, puis verrouillent les sujets et portefeuilles dans un ordre cohérent. Les règlements de sujets sont sérialisés pour éviter les doubles paiements et les courses entre résultats d’un même ticket. Cette stratégie privilégie la simplicité pour le volume actuel ; une forte croissance nécessiterait de réexaminer cette sérialisation.

Contrôles réussis : TypeScript, ESLint et build Vinext. Le build conserve l’avertissement existant de taille de bundle.

`supabase/verify-combined-wagers.sql` et `supabase/verify-fixed-odds.sql` ont été exécutés ensemble, avant installation puis sur le serveur installé, dans des transactions terminées par `ROLLBACK`. Ils couvrent les validations, doublons de sujets, cotes modifiées, requêtes répétées (y compris après règlement), permissions, exclusions, expiration, montant maximal, refus sans débit, conditions figées, attente, victoire, perte immédiate, annulations partielles et intégrales, paiement unique, paris simples, classement et concordance des soldes avec le journal. Aucun utilisateur de test n’est conservé et aucun e-mail n’est envoyé.

L’advisor de sécurité ne relève aucune nouvelle alerte ; l’avertissement Auth préexistant sur les mots de passe compromis demeure. Les tests de requêtes répétées sont transactionnels ; aucune nouvelle campagne de connexions simultanées n’a été exécutée. Le parcours connecté dans le navigateur reste à vérifier avec une session utilisateur. L’interface locale n’a pas été publiée sur le site hébergé dans cette intervention.
