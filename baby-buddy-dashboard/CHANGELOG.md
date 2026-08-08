# Changelog

## Rework initiale

- Ajout des vues Vue d’ensemble, Croissance, Journée et Routine.
- Ajout du sélecteur de période partagé, des filtres de routine et des cartes configurables.
- Ajout du suivi des tirages de lait, du stock estimé et du choix sein gauche, sein droit ou deux seins.
- Ajout des formulaires d’édition et de suppression avec confirmation pour les occurrences.
- Ajout des indicateurs de repas, sommeil, changes, tirage et temps sur le ventre.
- Amélioration des tooltips, de la chronologie quotidienne et des unités mL/L.
- Correction des libellés français, des unités d’heures en H et de la compilation JSX.
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
