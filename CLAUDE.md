# Directives Globales pour l'Assistant (Claude Code)

En tant qu'assistant de code, tu dois **strictement** respecter les règles suivantes lors de chaque interaction et modification sur ce dépôt.

## 1. Approche et Comportement (Règles strictes)

* **Lecture avant écriture :** Lis toujours les fichiers existants avant de commencer à écrire ou modifier du code. Ne relis pas un fichier s'il n'a pas été modifié.
* **Efficacité et Style :** Sois approfondi dans ton raisonnement interne, mais extrêmement concis dans tes réponses écrites.
* **Fichiers volumineux :** Ignore les fichiers de plus de 100KB, sauf si c'est absolument requis pour la tâche.
* **Ton direct :** Aucune phrase d'introduction flatteuse ou de conclusion inutile ("fluff"). Pas de politesse excessive.
* **Formatage du texte :** N'utilise pas d'emojis dans tes textes explicatifs ni de tirets cadratins (—). **Exception :** Les Gitmojis restent strictement obligatoires pour les commits (voir section 2).
* **Zéro supposition (Anti-Hallucination) :** Ne devine jamais les APIs, les versions, les arguments (flags), les SHAs de commit ou les noms de paquets. Vérifie toujours en lisant le code ou la documentation locale avant d'affirmer ou d'utiliser quoi que ce soit.

## 2. Gestion de Version (Git) et Commits

* **Push Automatique :** Après chaque modification validée par un commit, tu dois SYSTÉMATIQUEMENT pousser les modifications sur la branche principale (`fytroz` selon celle qui est active). Utilise la commande appropriée (ex: `git push origin fytroz`).
* **Gitmoji Obligatoire :** Tous les messages de commit doivent commencer par un Gitmoji approprié correspondant à l'action réalisée. Réfère-toi à la norme officielle : https://gitmoji.dev/api/gitmojis (ex: `✨ feat: ...`, `🐛 fix: ...`, `♻️ refactor: ...`).
* **Format des Commits (Concis) :** 
  * Le titre du commit doit être clair et direct.
  * Le corps du message (description) doit être **concis** : va à l'essentiel sans faire un roman. S'il y a plusieurs changements, utilise une liste à puces courte (maximum 3 à 4 points très brefs).
* **PAS DE SIGNATURE :** Tu ne dois **JAMAIS** inclure de ligne `Co-Authored-By:`, de nom d'auteur, ni d'adresse email à la fin de tes messages de commit. Le message doit se terminer par le texte descriptif du code.

## 3. Compte-rendu de fin de tâche

À la fin de chaque tâche ou intervention, tu dois **obligatoirement** générer un rapport final structuré exactement comme suit :

### 📝 Résumé de l'intervention

* **Problématique :** [Description claire du problème initial ou de la demande]
* **Analyse :** [Explication de ton raisonnement, des causes trouvées ou de l'architecture pensée]
* **Solution mise en place :** [Détail technique des modifications apportées (fichiers modifiés, logique changée)]

### 🧪 Tests et Validation

* **Tests réalisés :** [Liste des tests exécutés manuellement ou scriptés]
* **✅ Ce qui s'est bien passé :** [Résultats positifs]
* **❌ Ce qui a échoué ou reste fragile :** [Erreurs rencontrées, limites de la solution actuelle]

### 👤 Actions requises de la part de l'utilisateur

*(S'il n'y a rien à faire, indique "Aucune action requise")*

⚠️ **RÈGLE STRICTE SUR LE DÉPLOIEMENT :** L'infrastructure tourne sur Unraid. Les images sont buildées par GitHub Actions et mises à jour automatiquement via Watchtower. **Tu ne dois JAMAIS demander à l'utilisateur de se connecter à son serveur pour faire des `git pull`, `docker-compose up --build`, `docker restart` ou toute autre action de déploiement manuel.**

* **Explications :** [Décris uniquement ce que je dois faire pour configurer localement, tester, ou modifier des variables d'environnement, hors déploiement]
* **Commandes locales/annexes (NON liées au déploiement serveur) :**
  ```
  # Seulement si nécessaire pour le dev local
  ```
* **Code à ajouter/modifier manuellement :**
  ```
  // Mets ici le code précis que je dois écrire, et indique dans quel fichier
  ```