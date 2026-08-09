# Baby Buddy Dashboard Rework

Dashboard indépendant en français pour [Baby Buddy](https://github.com/babybuddy/babybuddy), installable comme add-on Home Assistant, application Docker autonome ou environnement de développement local.

Ce projet est dérivé de [mbentancour/baby-buddy-dashboard](https://github.com/mbentancour/baby-buddy-dashboard) sous licence MIT. L’architecture d’origine est conservée, tandis que l’interface et la gestion des données ont été largement retravaillées.

## Fonctionnalités

- Onglets Aperçu, Croissance, Journée, Routine et Notes
- Interface responsive pour ordinateur, tablette et mobile
- Création, modification et suppression rapides des occurrences
- Suivi des repas, sommeils, changes, tirages, temps sur le ventre, mesures et notes
- Périodes, graphiques, cartes et préférences configurables
- Stock estimé de lait maternel et occurrences indépendantes de lait non bu
- Traduction française des données provenant de Baby Buddy

Le lait non bu est propre au dashboard et persiste dans `/data/milk-waste.json`. Il réduit la quantité réellement bue, sans créer de second repas Baby Buddy et sans provoquer une seconde déduction du stock.

## Installation Home Assistant

1. Ouvrir **Paramètres > Modules complémentaires > Boutique des modules complémentaires**.
2. Dans le menu à trois points, ouvrir **Dépôts**.
3. Ajouter :

   ```text
   https://github.com/Flifette/baby-buddy-rework
   ```

4. Installer **Baby Buddy Dashboard Rework**.
5. Renseigner l’URL et la clé API de Baby Buddy, puis démarrer l’add-on.

Le slug historique `baby-buddy-dashboard` est volontairement conservé pour maintenir la compatibilité avec l’installation existante et ses données `/data`. Ce fork ne peut donc pas être installé côte à côte avec l’add-on d’origine sur la même instance Home Assistant.

Architectures prises en charge : `amd64` et `aarch64`. Les anciennes images de base 32 bits déclarées par le dépôt d’origine ne sont plus publiées pour la base Python Home Assistant sélectionnée.

## Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

Cette commande construit votre version depuis le dépôt cloné. Pour utiliser une instance Baby Buddy existante, remplacer `BABY_BUDDY_URL` dans `.env` par une adresse joignable depuis le conteneur.

Pour démarrer Baby Buddy et le dashboard ensemble :

```bash
docker compose --profile full up -d --build
```

Baby Buddy écoute sur le port `8000` et le dashboard sur le port `8099`. Les volumes nommés `babybuddy_data` et `dashboard_data` assurent la persistance.

## Docker autonome

```bash
docker build -t baby-buddy-dashboard-rework .
docker run -d --name baby-buddy-dashboard-rework \
  -p 8099:8099 \
  -e BABY_BUDDY_URL=http://votre-baby-buddy:8000 \
  -e BABY_BUDDY_API_KEY=votre_cle_api \
  -v baby-buddy-dashboard-data:/data \
  baby-buddy-dashboard-rework
```

Des images de version peuvent également être publiées sous `ghcr.io/flifette/baby-buddy-rework:<version>`. La construction depuis les sources reste la méthode canonique et ne dépend pas de la visibilité du paquet.

## Développement local

Prérequis : Node.js 20 ou plus récent, Python 3.10 ou plus récent et une instance Baby Buddy joignable.

```powershell
Copy-Item .env.example .env
.\run_local.ps1
```

Sous Bash, utiliser `./run_local.sh`. Le frontend écoute sur `http://localhost:5173`, le backend sur `http://localhost:8099`, et les données locales du dashboard sont écrites dans le dossier ignoré `.local-data`.

## Sécurité et données

Ne jamais publier le fichier `.env`, les clés API, les données runtime, les sauvegardes ou les scripts temporaires. La clé Baby Buddy reste côté backend et n’est pas transmise au navigateur.

## Licence

Projet distribué sous [licence MIT](LICENSE). L’attribution du dépôt d’origine et la nature des modifications sont précisées dans [NOTICE](NOTICE).
