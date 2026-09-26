# PharmaGarde Pointe-Noire

Les pharmacies de garde de Pointe-Noire, à portée de main : planning hebdomadaire officiel, vérifié par téléphone, géolocalisé et appelable en un geste.

## À propos

Chaque semaine, l'organisation des pharmaciens de la ville publie la liste des officines de garde. **PharmaGarde** rend cette liste consultable, filtrable et localisable, du téléphone comme de l'ordinateur.

Actuellement : **26 pharmacies joignables et vérifiées** sur les 32 annoncées, réparties sur les 6 arrondissements de Pointe-Noire.

## Fonctionnalités

- **Planning hebdomadaire** — qui est de garde, jusqu'à quand, avec distinction 24h/24 / sur appel
- **Recherche par médicament** — où trouver un produit, à quel prix indicatif (FCFA)
- **Carte interactive** — pharmacies géolocalisées, triées par distance
- **Page d'urgence** — numéros utiles et informations de secours, même en cas de panne

## Stack Technique

| Couche | Technologie |
|--------|------------|
| **Backend** | Node.js — json-server |
| **Frontend** | HTML · Tailwind CSS v4 · JavaScript vanilla |
| **Cartographie** | Leaflet + OpenStreetMap |
| **Données** | Liste hebdomadaire officielle des pharmacies de garde |

## Feuille de Route

- [ ] Initialisation du dépôt
- [ ] API json-server (pharmacies, gardes, médicaments, FAQ, numéros d'urgence)
- [ ] Pages : accueil, liste, fiche détail, carte, médicaments, FAQ, urgences
- [ ] Version 1.0.0
