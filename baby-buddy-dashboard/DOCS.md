# Configuration

## Connexion

- **URL de Baby Buddy** : URL complète de l’instance, joignable depuis Home Assistant.
- **Clé API** : jeton disponible dans les réglages du compte Baby Buddy.
- **Intervalle d’actualisation** : délai entre deux actualisations, de 5 à 300 secondes.
- **Mode démonstration** : données fictives sans connexion à Baby Buddy.
- **Système d’unités** : libellés métriques ou impériaux.

Après enregistrement de la configuration, démarrez l’add-on et utilisez **Ouvrir l’interface Web** ou l’entrée de la barre latérale.

## Persistance du lait non bu

Les occurrences de lait non bu sont propres au dashboard et enregistrées dans le stockage persistant `/data` de l’add-on. Elles ne créent jamais de repas dans Baby Buddy.

- quantité réellement bue = quantité du repas − lait non bu associé ;
- stock estimé = lait tiré − lait maternel mis au biberon ;
- le lait non bu n’est pas déduit une seconde fois du stock.

La conservation du slug `baby-buddy-dashboard` maintient la compatibilité avec les installations existantes. N’installez pas ce fork en parallèle de l’add-on d’origine sur la même instance.

## Sauvegarde

Incluez les données de l’add-on dans vos sauvegardes Home Assistant. Ne publiez jamais votre clé API ou une copie des données `/data`.
