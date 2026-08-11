# Baby Buddy Dashboard Rework

Dashboard indépendant en français pour [Baby Buddy](https://github.com/babybuddy/babybuddy), installable comme add-on Home Assistant, application Docker autonome ou environnement de développement local.

Ce projet est dérivé de [mbentancour/baby-buddy-dashboard](https://github.com/mbentancour/baby-buddy-dashboard) sous licence MIT. L’architecture d’origine est conservée, tandis que l’interface et la gestion des données ont été largement retravaillées.

[English documentation](README.md)

## Table des matières

- [À propos et remerciements](#à-propos-et-remerciements)
- [Fonctionnalités](#fonctionnalités)
- [Captures d’écran](#captures-décran)
- [Cartes et helpers Home Assistant](#cartes-et-helpers-home-assistant)
- [Installation Home Assistant](#installation-home-assistant)
- [Docker Compose](#docker-compose)
- [Docker autonome](#docker-autonome)
- [Développement local](#développement-local)
- [Configuration](#configuration)
- [Construction et tests](#construction-et-tests)
- [Sécurité et données](#sécurité-et-données)
- [Licence](#licence)

## À propos et remerciements

Je ne suis pas un développeur confirmé : je débute, et ce projet a été réalisé en grande partie avec l’accompagnement et sous la supervision de Codex. Je le partage sans prétendre pouvoir en assurer la maintenance indéfiniment, mais avec l’envie que ce travail puisse être utile à d’autres.

Merci à [mbentancour/baby-buddy-dashboard](https://github.com/mbentancour/baby-buddy-dashboard) pour cette formidable base de travail et pour tout le travail déjà accompli, qui m’a donné beaucoup d’idées pour ce dashboard.

Mais je tiens surtout à adresser cent millions de mercis à [herveaurel/HomeAssistant](https://github.com/herveaurel/HomeAssistant). C’est son fabuleux dashboard « Mad-Geek » qui m’a donné envie de me lancer dans Home Assistant. Pendant près de deux ans, son travail m’a passionné, inspiré et aidé à comprendre tout un univers que je ne connaissais pas. Sans ce partage, je ne serais probablement jamais arrivé jusque-là.

## Fonctionnalités

- Onglets Aperçu, Croissance, Journée, Routine et Notes
- Interface responsive pour ordinateur, tablette et mobile
- Création, modification et suppression rapides des occurrences
- Suivi des repas, sommeils, changes, tirages, temps sur le ventre, mesures et notes
- Périodes, graphiques, cartes et préférences configurables
- Stock estimé de lait maternel et occurrences indépendantes de lait non bu
- Traduction française des données provenant de Baby Buddy

Le lait non bu est propre au dashboard et persiste dans `/data/milk-waste.json`. Il réduit la quantité réellement bue, sans créer de second repas Baby Buddy et sans provoquer une seconde déduction du stock.

## Captures d’écran

<table>
  <tr>
    <td align="center"><strong>Aperçu</strong><br><img src="screenshots/overview-current.jpg" alt="Vue Aperçu du dashboard" width="440"></td>
    <td align="center"><strong>Croissance et stock de lait</strong><br><img src="screenshots/growth-current.jpg" alt="Graphiques de croissance et stock de lait" width="440"></td>
  </tr>
  <tr>
    <td align="center"><strong>Chronologie de la journée</strong><br><img src="screenshots/day-timeline.jpg" alt="Chronologie des activités de la journée" width="440"></td>
    <td align="center"><strong>Routine</strong><br><img src="screenshots/routine-overview.jpg" alt="Visualisation des routines" width="440"></td>
  </tr>
  <tr>
    <td align="center"><strong>Notes</strong><br><img src="screenshots/notes-view.jpg" alt="Vue des notes" width="440"></td>
    <td align="center"><strong>Tuiles personnalisables</strong><br><img src="screenshots/tile-settings.jpg" alt="Réglages des tuiles" width="440"></td>
  </tr>
</table>

## Cartes et helpers Home Assistant

L’add-on n’est pas la seule manière d’utiliser Baby Buddy dans Home Assistant. Le guide [Exemples Home Assistant pour Baby Buddy](examples/home-assistant/README.md) fournit une base générique pour créer des formulaires Lovelace, des helpers, une sélection dynamique des enfants, des boutons rapides et des activités chronométrées dans n’importe quelle vue.

## Installation Home Assistant

Ajouter ce dépôt à Home Assistant en un clic :

[![Ouvrir votre instance Home Assistant et ajouter le dépôt Baby Buddy Dashboard Rework](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FFlifette%2Fbaby-buddy-rework)

Il est également possible de l’ajouter manuellement :

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

Les installations Docker autonomes prennent également en charge `linux/amd64` et `linux/arm64`. Les images `arm/v7` 32 bits ne sont pas publiées, car les dépendances Python actuelles ne fournissent pas une chaîne de construction compatible pour cette plateforme.

## Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

Avant le démarrage, remplacer `DASHBOARD_PASSWORD` dans `.env` par un mot de passe unique d'au moins 16 caractères. Les installations autonomes imposent une authentification HTTP Basic ; le navigateur demandera `DASHBOARD_USERNAME` et `DASHBOARD_PASSWORD`.

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
  -e DASHBOARD_USERNAME=admin \
  -e DASHBOARD_PASSWORD=remplacer_par_un_mot_de_passe_unique_de_16_caracteres \
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

## Configuration

| Variable | Utilisation | Valeur par défaut |
| --- | --- | --- |
| `BABY_BUDDY_URL` | URL de base de Baby Buddy | `http://babybuddy:8000` |
| `BABY_BUDDY_API_KEY` | Jeton API Baby Buddy | obligatoire hors mode démonstration |
| `DASHBOARD_USERNAME` | Identifiant HTTP Basic de l'installation autonome | obligatoire en mode autonome |
| `DASHBOARD_PASSWORD` | Mot de passe HTTP Basic autonome, 16 caractères minimum | obligatoire en mode autonome |
| `REFRESH_INTERVAL` | Intervalle d’actualisation en secondes | `30` |
| `UNIT_SYSTEM` | Libellés `metric` ou `imperial` | `metric` |
| `DEMO_MODE` | Utiliser les données de démonstration | `false` |
| `TZ` | Fuseau horaire du conteneur | `Europe/Paris` |
| `MILK_WASTE_FILE` | Fichier de persistance en installation autonome | `/data/milk-waste.json` |

Conserver `.env`, les clés API, les données runtime, les sauvegardes et les scripts temporaires hors de Git.

L'add-on Home Assistant s'appuie sur l'ingress authentifié du Supervisor et n'utilise pas les identifiants autonomes. Ne pas exposer les ports de développement ni contourner l'ingress de l'add-on. Consulter [SECURITY.md](SECURITY.md) pour le périmètre de sécurité pris en charge et le signalement responsable.

## Construction et tests

```bash
cd baby-buddy-dashboard/frontend
npm ci
npm test
npm run build
```

GitHub Actions valide le frontend, le backend Python, les métadonnées de l’add-on, l’image autonome et toutes les architectures Home Assistant déclarées. Les tags de version peuvent publier une image autonome multiarchitecture dans GHCR.

## Sécurité et données

Ne jamais publier le fichier `.env`, les clés API, les données runtime, les sauvegardes ou les scripts temporaires. La clé Baby Buddy reste côté backend et n’est pas transmise au navigateur.

## Licence

Projet distribué sous [licence MIT](LICENSE). L’attribution du dépôt d’origine et la nature des modifications sont précisées dans [NOTICE](NOTICE).
