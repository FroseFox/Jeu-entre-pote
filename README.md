# Round & Round pour Unity

[Télécharger le projet Unity (.zip)](https://codeload.github.com/FroseFox/Jeu-entre-pote/zip/refs/heads/unity) · [Jouer à la version web](https://frosefox.github.io/Jeu-entre-pote/)

Adaptation native en C# de la version web du dépôt FroseFox/Jeu-entre-pote, inspirée de *Round and Round Inc.* de Murbong. Le projet utilise le pipeline de rendu intégré et les entrées classiques de Unity. Les personnages proches et la porte sont des objets 3D.

## Ouvrir la scène

1. Décompressez le projet.
2. Dans Unity Hub, utilisez **Add → Add project from disk** et sélectionnez le dossier contenant **Assets**, **Packages** et **ProjectSettings**.
3. Ouvrez-le avec **Unity 6 LTS 6000.0.58f2**. Une première scène vierge ouvre automatiquement **Quartier**. Vous pouvez aussi choisir **Round and Round → Ouvrir le quartier**, puis lancer **Play**.

Dans la fenêtre Game, cliquez sur la place, maintenez Espace ou tracez un cercle autour de la porte. La molette et les boutons de vue contrôlent le zoom. P met le jeu en pause.

## Modifier le jeu

| Élément | Emplacement |
| --- | --- |
| Porte, panneaux, moyeu et garde-corps | Assets/Prefabs/Porte.prefab |
| Forme des pales selon leur niveau | Assets/Scripts/BladeProfile.cs |
| Silhouette et marche des visiteurs | Assets/Prefabs/Visiteur.prefab et Assets/Scripts/Visitor.cs |
| Coûts, progression, descriptions, limite de personnages individuels | Assets/Rules.asset |
| Quartiers, transports et éclairage | Objets de la scène Quartier |
| Arrivées, recettes, bonus et événements | Assets/Scripts/RoundGame.cs |
| Interface et commandes de gestion | Assets/Scripts/RoundGame.Interface.cs |
| Foule lointaine | Assets/Scripts/StreetCrowd.cs, Assets/Shaders/Street.shader et Assets/Materials/Passants.png |

L’objet **Agence** relie la simulation aux objets de la scène. Le prefab de la porte contient un rotor à dix bras dont quatre sont actifs au départ. Chaque pale comporte cinq sections orientées par son profil. Pour voir la foule à grande échelle, sélectionnez une taille dans **Options** puis éloignez la caméra. Les grands groupes utilisent des rangées texturées avec les silhouettes animées tirées de la version web.

## Sauvegardes

La session native se sauvegarde dans PlayerPrefs toutes les quatre secondes et à la fermeture de l’application. **Parties** propose quatre copies nommées. **Options → Nouvelle partie** réinitialise la partie active et l’affluence. Les copies nommées restent disponibles.

Pour récupérer une progression web, exportez le fichier JSON depuis **Parties locales** sur le site. Dans l’éditeur Unity, utilisez **Round and Round → Importer une partie web dans un emplacement…**. Lancez la scène, ouvrez **Parties** et chargez **Import web**. L’import reprend notamment la trésorerie, les niveaux, les entrées, les lignes de transport, les avantages, les contrats actifs et l’agence. Les visiteurs individuels et les animations en cours sont recréés pour la simulation native.

## Périmètre de cette version

Le projet inclut la boutique, les arrivées de groupes, les visiteurs spéciaux, les éjections, les ballons, les transports, les réouvertures, les contrats et le tirage de récompenses. Les modèles 3D, la rotation, les trajectoires et l’interface ont été adaptés à Unity. Le carnet de collection, la roue animée, certaines interactions entre personnages et les effets détaillés des décors web ne sont pas intégralement reproduits.
