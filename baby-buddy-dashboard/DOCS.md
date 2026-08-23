# Baby Buddy Dashboard Rework

[English](#english) · [Français](#français)

## English

### Requirements

Baby Buddy Dashboard Rework does not replace Baby Buddy. Before installing this add-on, you need a working Baby Buddy instance reachable from Home Assistant, together with its URL and an API key.

The separate community Home Assistant Baby Buddy integration is **not required** for this Dashboard add-on, which communicates directly with the Baby Buddy API. It is required only if you also want to use the example Lovelace cards, helpers, and HAOS scripts provided in the repository.

### Connection

- **Baby Buddy URL**: full URL of the instance, reachable from Home Assistant.
- **API key**: token available in the Baby Buddy account settings.
- **Refresh interval**: delay between refreshes, from 5 to 300 seconds.
- **Demo mode**: fictional data without a Baby Buddy connection.
- **Unit system**: metric or imperial labels.

After saving the configuration, start the add-on and use **Open Web UI** or its sidebar entry.

### Language selection

Use the compact **FR / EN** selector in the dashboard header to change the interface language immediately. Views, cards, forms, buttons, charts, tooltips, dates, times, activity labels, and validation or error messages are translated together.

The preference is stored locally in the browser, so each device or browser profile can keep its own language. This setting changes only the displayed interface; it does not translate or alter Baby Buddy records or the technical values sent to its API. French is the default until a preference is saved.

The labels shown on the add-on **Configuration** tab are also available in English and French and follow the language selected in Home Assistant.

### Direct breastfeeding

When the feeding method is the left breast, right breast, or both breasts, the form does not request or send an estimated amount. Direct breastfeeding therefore never removes milk from the estimated stock.

The Growth view still records these feedings as occurrences. In the Day period they appear as individual pink points, while measured feedings remain orange. Longer periods show the daily breastfeeding count in pink alongside measured feeding volumes without adding the two values together. Any amount stored on an older direct-breastfeeding record is ignored by dashboard totals, charts, and stock calculations.

### Uneaten milk persistence

Uneaten-milk occurrences belong only to this dashboard and are saved in the add-on's persistent `/data` storage. They never create another feeding in Baby Buddy.

- amount actually consumed = feeding amount − associated uneaten milk;
- estimated stock = pumped milk − breast milk put in bottles;
- uneaten milk is not deducted from stock a second time.

The historical `baby-buddy-dashboard` slug preserves compatibility with existing installations. Do not install this fork alongside the original add-on on the same Home Assistant instance.

### Backup

Include the add-on data in your Home Assistant backups. Never publish your API key or a copy of the `/data` directory.

---

## Français

### Prérequis

Baby Buddy Dashboard Rework ne remplace pas Baby Buddy. Avant d’installer cet add-on, vous devez disposer d’une instance Baby Buddy fonctionnelle et joignable depuis Home Assistant, ainsi que de son URL et d’une clé API.

L’intégration communautaire Home Assistant Baby Buddy séparée n’est **pas obligatoire** pour cet add-on Dashboard, qui communique directement avec l’API Baby Buddy. Elle devient obligatoire uniquement si vous souhaitez également utiliser les exemples de cartes Lovelace, helpers et scripts HAOS fournis dans le dépôt.

### Connexion

- **URL de Baby Buddy** : URL complète de l’instance, joignable depuis Home Assistant.
- **Clé API** : jeton disponible dans les réglages du compte Baby Buddy.
- **Intervalle d’actualisation** : délai entre deux actualisations, de 5 à 300 secondes.
- **Mode démonstration** : données fictives sans connexion à Baby Buddy.
- **Système d’unités** : libellés métriques ou impériaux.

Après enregistrement de la configuration, démarrez l’add-on et utilisez **Ouvrir l’interface Web** ou l’entrée de la barre latérale.

### Choix de la langue

Le sélecteur compact **FR / EN** placé dans l’en-tête change immédiatement la langue du dashboard. Les vues, tuiles, formulaires, boutons, graphiques, infobulles, dates, heures, libellés d’activités et messages de validation ou d’erreur sont traduits ensemble.

La préférence est mémorisée localement dans le navigateur : chaque appareil ou profil de navigateur peut donc conserver sa propre langue. Ce réglage modifie uniquement l’interface affichée ; il ne traduit ni ne modifie les occurrences Baby Buddy ou les valeurs techniques envoyées à son API. Le français est utilisé par défaut jusqu’à l’enregistrement d’un choix.

Les libellés de l’onglet **Configuration** de l’add-on sont également disponibles en anglais et en français et suivent la langue choisie dans Home Assistant.

### Allaitement au sein

Lorsque la méthode choisie est sein gauche, sein droit ou les deux seins, le formulaire ne demande et n’envoie aucune quantité estimée. L’allaitement au sein ne retire donc jamais de lait du stock estimé.

La vue Croissance conserve néanmoins chaque allaitement comme une occurrence. En temporalité Jour, il apparaît sous forme de point rose indépendant tandis que les repas mesurés restent orange. Les périodes plus longues affichent le nombre quotidien d’allaitements en rose à côté des volumes mesurés, sans additionner ces deux valeurs. Toute quantité présente sur un ancien allaitement est ignorée dans les totaux, graphiques et calculs de stock du dashboard.

### Persistance du lait non bu

Les occurrences de lait non bu sont propres au dashboard et enregistrées dans le stockage persistant `/data` de l’add-on. Elles ne créent jamais de repas dans Baby Buddy.

- quantité réellement bue = quantité du repas − lait non bu associé ;
- stock estimé = lait tiré − lait maternel mis au biberon ;
- le lait non bu n’est pas déduit une seconde fois du stock.

La conservation du slug `baby-buddy-dashboard` maintient la compatibilité avec les installations existantes. N’installez pas ce fork en parallèle de l’add-on d’origine sur la même instance.

### Sauvegarde

Incluez les données de l’add-on dans vos sauvegardes Home Assistant. Ne publiez jamais votre clé API ou une copie des données `/data`.
