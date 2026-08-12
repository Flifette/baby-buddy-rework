# Changelog

# 1.6.0

- Clarification bilingue des prérequis : le Dashboard nécessite une instance Baby Buddy existante, mais pas l’intégration Home Assistant Baby Buddy séparée.
- Distinction explicite avec les exemples de cartes, helpers et scripts HAOS, qui nécessitent à la fois Baby Buddy et l’intégration communautaire Home Assistant.
- Première publication regroupée depuis l’ouverture publique du dépôt et la mise en place des branches protégées.

# 1.5.9

- Harmonisation du symbole français des heures en `h` minuscule dans les tuiles, listes, graphiques et durées relatives.
- Documentation Home Assistant désormais bilingue anglais/français et explication du sélecteur de langue persistant.

# 1.5.8

- Adaptation de la couleur de la barre du minuteur au type d’occurrence actif : orange pour les repas, violet pour le sommeil et rose pour le temps sur le ventre.

# 1.5.7

- Application du cadre de largeur maîtrisée à tous les contrôles temporels natifs, y compris les champs de date des formulaires Poids et Taille.

# 1.5.6

- Encadrement indépendant des contrôles date/heure natifs afin que leur largeur interne propre au navigateur ne puisse plus dépasser visuellement des formulaires.

# 1.5.5

- Compensation ciblée de la largeur intrinsèque ajoutée par iPadOS aux champs date/heure afin de les aligner exactement avec les autres champs.

# 1.5.4

- Renforcement de la mise en page des champs date/heure natifs sur Safari/iPadOS afin de conserver la marge intérieure des formulaires.

# 1.5.3

- Traduction explicite des bulles natives de validation selon la langue sélectionnée dans le dashboard, indépendamment de la langue du navigateur ou de l’appareil.
- Correction du dépassement horizontal des champs, notamment les sélecteurs de date et d’heure sur Safari/iPadOS.

# 1.5.2

- Quantité de repas rendue obligatoire avec saisie au millilitre près.
- Détection des chevauchements de sommeil et de sieste avec message détaillé et traduit en français/anglais.
- Effacement immédiat des anciennes erreurs lorsqu’un champ est corrigé.
- Clarification du formulaire de lait non bu sans suggérer une seconde déduction du stock.
- Sélection du type de change rendue explicite et obligatoire.
- Messages d’erreur traduits et différenciés pour les champs incomplets ou invalides, les doublons, les problèmes de connexion, les refus d’accès et les erreurs serveur.

# 1.5.1

- Correction de la soumission tactile des formulaires sur Safari/iPadOS.
- Affichage localisé des heures en anglais dans Journée et Routine, avec indicateurs AM/PM.
- Ajout explicite de la langue active aux contrôles natifs des formulaires.
- Affichage d’un message explicite lorsque Baby Buddy refuse un enregistrement ou que l’heure de fin précède l’heure de début.

# 1.5.0

- Ajout d’un sélecteur de langue compact français/anglais dans l’en-tête.
- Traduction complète des vues, tuiles, formulaires, graphiques, infobulles, fenêtres d’occurrences, réglages et messages d’état.
- Adaptation des dates, heures, durées et libellés Baby Buddy à la langue active.
- Conservation du choix de langue dans les préférences locales du navigateur.
- Séparation stricte entre les traductions d’interface et les identifiants techniques/API afin de préserver les données et les occurrences existantes.
- Ajout de tests garantissant la parité des catalogues français et anglais.

# 1.4.20

- Blocage de la lecture de fichiers hors du frontend compilé.
- Ajout d'une authentification HTTP Basic obligatoire pour les installations autonomes ; l'add-on conserve l'authentification par ingress Home Assistant.
- Limitation de la taille des requêtes et du stockage persistant du lait non bu, avec diffusion progressive des réponses Baby Buddy.
- Mise à niveau des dépendances Python et JavaScript concernées par des avis de sécurité.
- Restriction des serveurs de développement locaux à l'interface de boucle locale.
- Épinglage des actions de publication sur des commits immuables.
- Construction du frontend sur l'architecture native avant l'assemblage de
  l'image aarch64, afin d'éviter l'exécution instable de Node sous QEMU.
- Migration des images de base Home Assistant vers le Dockerfile, conformément au format Supervisor actuel.

# 1.4.19

- Préparation de la distribution publique du fork sans modification du comportement du dashboard.
- Correction des métadonnées du dépôt et ajout de la traduction française des réglages Home Assistant.
- Ajout des installations Docker Compose, Docker autonome et développement local Windows, avec persistance du lait non bu.
- Ajout des validations CI multi-architecture et de la publication optionnelle d’images GHCR.
- Validation du support Home Assistant actuel sur amd64 et aarch64 ; retrait des images 32 bits obsolètes qui n’étaient plus publiées.

## Rework initiale

- Ajout des vues Vue d’ensemble, Croissance, Journée et Routine.
- Ajout du sélecteur de période partagé, des filtres de routine et des cartes configurables.
- Ajout du suivi des tirages de lait, du stock estimé et du choix sein gauche, sein droit ou deux seins.
- Ajout des formulaires d’édition et de suppression avec confirmation pour les occurrences.
- Ajout des indicateurs de repas, sommeil, changes, tirage et temps sur le ventre.
- Amélioration des tooltips, de la chronologie quotidienne et des unités mL/L.
- Correction des libellés français, des unités d’heures et de la compilation JSX.
# 1.3.0

- Ajout d’une occurrence « Lait non bu » qui retire du stock sans créer de repas.
- Correction des données manquantes pour la temporalité « Jour » dans Croissance.
- Optimisation de la temporalité « Total » dans Croissance.
- Masquage des graphiques repas et sommeil de la Vue d’ensemble en temporalité « Jour ».

# 1.4.0

- Ajout d’une icône de biberon barré pour le lait non bu et passage de cette donnée en gris.
- Mise à jour du stock de la Vue d’ensemble et ajout du lait non bu dans la chronologie Journée.
- Nouvelle chronologie Journée en arbre alterné.
- Correction de l’enregistrement en un seul appui dans les formulaires tactiles.
- Affichage permanent des dernières mesures de poids et de taille dans Croissance.
- Adaptation de Croissance en période Jour avec les repas et sommeils positionnés par heure.

# 1.4.1

- Rétablissement des tuiles Repas et Sommeil dans Croissance en période Jour avec des totaux journaliers.
- Étalonnage du graphique de stock de lait sur 24 heures en période Jour.
- Protection contre les réponses de période obsolètes lors d’un changement rapide de temporalité.
- Réparation des réglages de tuiles et ajout des réglages Repas et Sommeil pour Croissance.
- Passage de l’icône et du formulaire Lait non bu au gris.

# 1.4.2

- Ajout du temps sur le ventre à Croissance avec résumé, graphique et réglages dédiés.
- Application des mêmes temporalités que le sommeil, dont l’échelle sur 24 heures en période Jour.
- Ajout du temps sur le ventre à la grille et aux filtres de Routine comme activité chronométrée.
- Épaississement léger des barres horaires du stock de lait en période Jour.

# 1.4.3

- Correction du rendu des barres du stock de lait sur l’axe temporel Jour avec une largeur visuelle fixe.

# 1.4.4

- Réduction de moitié de la largeur des barres horaires du stock de lait en période Jour.

# 1.4.5

- Remplacement du libellé « Vue d’ensemble » par « Aperçu » dans l’onglet et les réglages.

# 1.4.6

- Remplacement de l’icône de l’onglet Aperçu par un œil.

# 1.4.7

- Correction de la sélection des séries Tiré et Lait non bu dans le graphique de stock.
- Ajout du nom du mouvement dans le bandeau de détail sélectionné.
- Correction du chevauchement des onglets Aperçu et Croissance sur mobile.

# 1.4.8

- Activation de la sélection Au biberon avec son libellé et sa quantité dans le graphique de stock.
- Suppression des zones de clic à 0 mL qui pouvaient intercepter une autre occurrence en période Jour.

# 1.4.9

- Refonte du sélecteur d’enfant dans le style visuel sombre de l’add-on.

# 1.4.10

- Déplacement du sélecteur d’enfant à côté du prénom sous la forme d’un chevron compact, sans répétition du prénom actif.

# 1.4.11

- Remplacement du libellé « Au biberon » par « Lait maternel au biberon » dans les affichages de stock.

# 1.4.12

- Traduction complète des types et méthodes de repas provenant de Baby Buddy, dont « parent fed » et « self fed ».
- Traduction des derniers libellés anglais dans les occurrences, les notes, les mesures et le minuteur.

# 1.4.13

- Correction du lait non bu : il réduit désormais les quantités réellement bues sans être déduit une seconde fois du stock.
- Application du calcul net aux résumés et graphiques de repas dans Aperçu et Croissance.
- Remplacement de « to » par « à » dans les plages horaires.

# 1.4.14

- Affichage de la quantité nette et du lait non bu directement dans les repas récents, avec association au dernier biberon de lait maternel de la journée.
- Application de cette association aux totaux, moyennes et graphiques de Croissance pour toutes les temporalités.

# 1.4.15

- Ajout d’une bulle Lait non bu dans Croissance : total pour Jour et moyenne quotidienne pour les autres temporalités.
- Ajout du réglage indépendant « Résumé du lait non bu » dans les réglages de Croissance.

# 1.4.16

- Déplacement de la bulle Lait non bu juste après la bulle Repas dans Croissance et dans l’ordre des réglages.

# 1.4.17

- Définition des réglages initiaux : Temps sur le ventre masqué dans Aperçu, et Lait non bu ainsi que les deux tuiles Temps sur le ventre masqués dans Croissance.
- Conservation des préférences personnalisées de chaque utilisateur après leur premier réglage.

# 1.4.18

- Correction de « Voir les occurrences » dans Aperçu et Croissance grâce à une clé de date stable, indépendante du libellé localisé affiché dans les graphiques.
