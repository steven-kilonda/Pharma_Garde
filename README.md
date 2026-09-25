<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=2,6,12&height=180&section=header&text=PharmaGarde&fontSize=48&fontColor=ffffff&animation=fadeIn&desc=Pointe-Noire%20%E2%80%A2%20Congo-Brazzaville&descAlignY=62&descSize=18" width="100%"/>

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Poppins&size=20&pause=1000&color=1E90FF&center=true&vCenter=true&width=600&lines=Trouvez+la+pharmacie+de+garde+la+plus+proche;Planning+en+temps+r%C3%A9el+%7C+Carte+interactive;Disponible+24h%2F24+%2C+7j%2F7" alt="Typing SVG" />

<br/><br/>

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

[![Status](https://img.shields.io/badge/Statut-Actif-2ECC71?style=flat-square)](#)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)](#)
[![License](https://img.shields.io/badge/Licence-MIT-lightgrey?style=flat-square)](#)
[![Ville](https://img.shields.io/badge/Ville-Pointe--Noire-orange?style=flat-square)](#)

</div>

<br/>

**PharmaGarde** est une application web qui permet de trouver facilement la **pharmacie de garde la plus proche** à Pointe-Noire (Congo-Brazzaville). Elle affiche le planning de la semaine, permet de filtrer par quartier ou arrondissement, de consulter les médicaments disponibles, et de signaler un problème.

<br/>

## Sommaire

- [Sommaire](#sommaire)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
- [Configuration de la base de données](#configuration-de-la-base-de-données)
- [Lancer le projet](#lancer-le-projet)
- [Scripts disponibles](#scripts-disponibles)
- [L'équipe](#léquipe)

<br/>

## Fonctionnalités

<table>
<tr>
<td width="50%">

**Recherche & consultation**
- Pharmacies de garde de la semaine
- Filtres : quartier, arrondissement, statut, garde 24h/24
- Carte interactive des pharmacies
- Consultation des médicaments et disponibilité

</td>
<td width="50%">

**Support & fiabilité**
- Foire aux questions (FAQ)
- Formulaire de signalement (info erronée, pharmacie manquante...)
- Numéros d'urgence toujours accessibles
- Repli automatique sur données locales

</td>
</tr>
</table>

<br/>

## Stack technique

<div align="center">

| Côté | Technologies |
|:---:|:---|
| **Backend** | ![Node](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) ![Postgres](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| **Frontend** | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) ![JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black) *(sans framework)* |

</div>

<br/>

## Architecture

```mermaid
flowchart LR
    A[Navigateur] -->|Requêtes HTTP| B(Frontend HTML/CSS/JS)
    B -->|Appels API - api.js| C[Backend Express]
    C --> D{PostgreSQL configuré ?}
    D -->|Oui| E[(Base PostgreSQL)]
    D -->|Non| F[(Données locales JSON)]
    C --> G[Routes API]
    G --> H[Controllers]
    H --> I[Utils / Requêtes SQL]
```

<br/>

## Structure du projet

```
.
├── package.json
├── .env.example
├── backend/
│   ├── index.js              # Point d'entrée du serveur
│   ├── controllers/          # Logique métier (pharmacies, arrondissements, signalements...)
│   ├── routes/               # Routes de l'API
│   ├── utils/                # Connexion base de données, requêtes SQL, gestion des erreurs
│   └── data/                 # Données de secours (mode sans base de données)
└── frontend/
    ├── index.html
    ├── pharmacies.html
    ├── medicaments.html
    ├── urgence.html
    ├── css/
    └── js/
        ├── api.js            # Appels vers l'API
        ├── components.js     # Composants réutilisables
        ├── utils.js           # Icônes et fonctions utilitaires
        └── pages/             # Scripts spécifiques à chaque page
```

<br/>

## Installation

**1. Cloner le projet**
```bash
git clone <url-du-repo>
cd pharmacie-de-garde
```

**2. Installer les dépendances**
```bash
npm install
```

**3. Créer un fichier `.env` à partir de l'exemple fourni**
```bash
cp .env.example .env
```

**4. Renseigner les variables dans `.env`** *(optionnel — voir ci-dessous)*

<br/>

## Configuration de la base de données

L'application peut fonctionner de deux façons :

| Mode | Description |
|---|---|
| **Avec PostgreSQL** | Renseigner `DATABASE_URL` (ou `PG_USER`, `PG_HOST`, `PG_DATABASE`, `PG_PASSWORD`, `PG_PORT`) dans le fichier `.env` |
| **Sans base de données** | Si aucune configuration PostgreSQL n'est fournie, l'application utilise automatiquement un jeu de données local (`backend/data/pharmaGarde.json`) |

Variables disponibles dans `.env.example` :

```env
PORT=3000
DATABASE_URL=
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=pharmagarde
PG_PASSWORD=
PG_PORT=5432
```

<br/>

## Lancer le projet

```bash
npm start
```

> Le serveur démarre sur `http://localhost:3000` (ou le port défini dans `.env`).

<br/>

## Scripts disponibles

| Commande | Description |
|:---|:---|
| `npm start` | Démarre le serveur |
| `npm run dev` | Démarre le serveur (mode développement) |
| `npm run seed` | Remplit la base de données avec des données de départ |
| `npm run lint` | Vérifie la syntaxe des fichiers backend |

<br/>

## L'équipe

<div align="center">

| Rôle | Nom |
|:---:|:---:|
| **Chef de Projet** | Cedric NGOUBI |
| **Développeur** | Alphadi MONDZALI |
| **Développeur** | Steven KILONDA |

</div>

<br/>

<div align="center">

Projet **PharmaGarde** — Pointe-Noire
<br/>
*BY AKIENI ACADEMY Intern*

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=2,6,12&height=100&section=footer" width="100%"/>

</div>