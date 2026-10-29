# Aperçu local de la refonte

Cet aperçu utilise les composants React et les styles de `next-app/` avec des données de démonstration. Les accès serveur, notifications, sessions et mutations sont remplacés uniquement dans la compilation de cet aperçu. Aucun de ces remplacements ne fait partie du build MediaHub.

Depuis la racine du dépôt :

    node .ui-review/build.cjs
    node .ui-review/server.cjs

Ouvrir http://127.0.0.1:4310/dashboard. Les écrans de démonstration couvrent l'accueil, la médiathèque, les demandes et leur suivi, les statistiques, les réglages, Docker, les notifications et les onglets de téléchargement. La sélection et les filtres des demandes ainsi que les contrôles de formulaire fonctionnent sur des données locales. Les rubriques de réglages utilisent un formulaire de démonstration ; les commandes serveur et certaines actions ne sont pas exécutées. Cet aperçu ne valide pas les intégrations serveur.

Les modifications du produit sont dans `next-app/`. Le nouveau thème Studio est appliqué par défaut en l'absence de préférence sauvegardée ; Classique et Ardoise restent sélectionnables dans Apparence.
