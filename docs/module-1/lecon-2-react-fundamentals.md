# Leçon 2 sur 42

## Fondamentaux de React : Composants, Props et Gestion d'État

React offre une approche puissante et déclarative pour construire des interfaces utilisateur. Au cœur des applications React se trouvent les composants, qui sont des morceaux d'interface réutilisables et autonomes. Ces composants communiquent et gèrent les données via les props et l'état, concepts fondamentaux pour créer des applications web dynamiques et interactives.

## Composants : Les Blocs de Construction de l'Interface

Les composants sont des morceaux de code indépendants et réutilisables qui retournent des éléments React, décrivant ce qui doit apparaître à l'écran. Ils permettent de diviser l'interface en parties indépendantes et réutilisables, et de penser à chaque partie de manière isolée. Les applications React sont essentiellement des arbres de composants.

Il existe deux façons principales de déclarer des composants : les composants fonctionnels et les composants de classe. Le développement React moderne utilise principalement des composants fonctionnels avec les Hooks, qui simplifient la logique des composants et la gestion d'état.

### Composants Fonctionnels

Les composants fonctionnels sont des fonctions JavaScript qui acceptent un seul objet "props" comme argument avec les données et retournent un élément React. Ils sont plus simples à écrire et à comprendre, et avec l'introduction des Hooks React, ils peuvent gérer l'état et les effets secondaires tout comme les composants de classe.

```jsx
// Composant fonctionnel de base
function MessageBienvenue(props) {
  return <h1>Bonjour, {props.nom} !</h1>;
}

// Autre composant fonctionnel
function CarteTour(props) {
  return (
    <div className="tour-card">
      <h2>{props.nomTour}</h2>
      <p>Lieu : {props.lieu}</p>
      <p>Prix : {props.prix} €</p>
      <button>Voir les détails</button>
    </div>
  );
}

// Utilisation des composants
function App() {
  return (
    <div>
      <MessageBienvenue nom="Voyageur" />
      <CarteTour nomTour="Visite Historique de la Ville" lieu="Rome" prix={99} />
      <CarteTour nomTour="Aventure en Montagne" lieu="Alpes Suisses" prix={250} />
    </div>
  );
}
```

Dans l'exemple `CarteTour`, le composant reçoit des données spécifiques au tour via les props et rend un `div` contenant ces informations. Ce composant peut être réutilisé pour n'importe quel tour en passant simplement des props différentes.

### Composants de Classe (Contexte Historique)

Les composants de classe sont des classes JavaScript ES6 qui étendent `React.Component` et ont une méthode `render()` qui retourne des éléments React. Bien qu'ils soient toujours supportés, ils sont moins courants dans le développement React moderne en raison des avantages des composants fonctionnels et des Hooks. Les comprendre fournit un contexte pour les anciennes bases de code.

```jsx
import React from 'react';

// Composant de classe de base
class MessageBienvenueClasse extends React.Component {
  render() {
    return <h1>Bonjour, {this.props.nom} !</h1>;
  }
}

// Utilisation du composant de classe
class AppClasse extends React.Component {
  render() {
    return (
      <div>
        <MessageBienvenueClasse nom="Explorateur" />
      </div>
    );
  }
}
```

La méthode `render()` est obligatoire dans les composants de classe et est responsable de retourner le JSX (JavaScript XML) qui décrit l'interface. Les props sont accessibles via `this.props`.

## Props : Transmission de Données dans l'Arbre de Composants

Les props (abréviation de properties/propriétés) sont la façon dont les données sont transmises d'un composant parent à un composant enfant. Les props sont en lecture seule ; un composant enfant ne devrait jamais modifier les props qu'il reçoit. Cette immutabilité garantit un flux de données unidirectionnel, rendant les applications plus faciles à comprendre et à déboguer.

### Passer des Props

Les props sont passées aux composants comme des attributs lorsqu'ils sont rendus.

```jsx
function ComposantParent() {
  const nomUtilisateur = "Alice";
  const idTour = "TOUR_001";

  return (
    <div>
      <MessageBienvenue nom={nomUtilisateur} /> {/* nomUtilisateur passé comme prop 'nom' */}
      <BoutonReservation idTour={idTour} /> {/* idTour passé comme prop 'idTour' */}
    </div>
  );
}

function MessageBienvenue(props) {
  return <p>Bienvenue, {props.nom} !</p>;
}

function BoutonReservation(props) {
  return <button onClick={() => alert(`Réservation du tour ${props.idTour}`)}>Réserver maintenant</button>;
}
```

Ici, `ComposantParent` passe `nomUtilisateur` à `MessageBienvenue` comme prop `nom` et `idTour` à `BoutonReservation` comme prop `idTour`. Les composants enfants accèdent ensuite à ces valeurs via leur objet `props`.

### Types de Props et Props par Défaut (TypeScript recommandé)

**Note importante** : L'utilisation de la bibliothèque `prop-types` est désormais considérée comme obsolète. **La meilleure pratique moderne est d'utiliser TypeScript** pour la vérification statique des types. TypeScript offre une meilleure expérience développeur, détecte les erreurs à la compilation et améliore l'autocomplétion dans l'IDE.

**Approche moderne avec TypeScript :**

```tsx
// Définition des types avec TypeScript
interface DetailsTourProps {
  titre: string;              // 'titre' est obligatoire
  duree?: number;            // 'duree' est optionnel
  estDisponible?: boolean;   // 'estDisponible' est optionnel
}

function DetailsTour({ titre, duree = 1, estDisponible = true }: DetailsTourProps) {
  return (
    <div>
      <h3>{titre}</h3>
      <p>Durée : {duree} jour(s)</p>
      <p>Disponible : {estDisponible ? 'Oui' : 'Non'}</p>
    </div>
  );
}

// Utilisation du composant
function App() {
  return (
    <div>
      <DetailsTour titre="Safari dans le Désert" duree={3} estDisponible={false} />
      <DetailsTour titre="Visite de la Ville à Pied" /> {/* duree sera 1, estDisponible sera true */}
    </div>
  );
}
```

**Approche historique avec prop-types (non recommandée pour les nouveaux projets) :**

```jsx
import PropTypes from 'prop-types';

function DetailsTour(props) {
  return (
    <div>
      <h3>{props.titre}</h3>
      <p>Durée : {props.duree} jour(s)</p>
      <p>Disponible : {props.estDisponible ? 'Oui' : 'Non'}</p>
    </div>
  );
}

// Définir les types de props pour le composant DetailsTour
DetailsTour.propTypes = {
  titre: PropTypes.string.isRequired, // 'titre' doit être une chaîne et est requis
  duree: PropTypes.number,            // 'duree' est un nombre optionnel
  estDisponible: PropTypes.bool,      // 'estDisponible' est un booléen optionnel
};

// Définir les props par défaut
DetailsTour.defaultProps = {
  duree: 1,              // Durée par défaut de 1 jour
  estDisponible: true,   // Disponibilité par défaut à true
};
```

## Gestion d'État : Données Dynamiques au Sein des Composants

L'état fait référence aux données gérées au sein d'un composant et qui peuvent changer au fil du temps, généralement en réponse à des actions utilisateur ou des réponses réseau. Lorsque l'état d'un composant change, React re-rend le composant et ses enfants pour refléter les données mises à jour. L'état est local au composant auquel il appartient et est privé sauf s'il est explicitement transmis via les props.

### État dans les Composants Fonctionnels avec le Hook useState

Le Hook `useState` est la méthode standard pour ajouter de l'état aux composants fonctionnels. Il retourne une valeur d'état et une fonction pour la mettre à jour.

```jsx
import React, { useState } from 'react';

function Compteur() {
  // Déclarer une variable d'état 'compteur' et sa fonction de mise à jour 'setCompteur'
  const [compteur, setCompteur] = useState(0); // L'état initial est 0

  return (
    <div>
      <p>Compteur actuel : {compteur}</p>
      <button onClick={() => setCompteur(compteur + 1)}>Incrémenter</button>
      <button onClick={() => setCompteur(compteur - 1)}>Décrémenter</button>
      <button onClick={() => setCompteur(0)}>Réinitialiser</button>
    </div>
  );
}

// Utilisation du composant Compteur
function App() {
  return <Compteur />;
}
```

Dans ce composant `Compteur`, `useState(0)` initialise `compteur` à 0. `setCompteur` est la fonction utilisée pour mettre à jour `compteur`. Lorsque `setCompteur` est appelée, React re-rend le composant `Compteur` avec la nouvelle valeur de `compteur`.

Un exemple plus complexe utilisant un objet dans l'état :

```jsx
import React, { useState } from 'react';

function FormulaireReservation() {
  const [detailsReservation, setDetailsReservation] = useState({
    nomTour: '',
    voyageurs: 1,
    dateReservation: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDetailsReservation(detailsPrecedents => ({
      ...detailsPrecedents, // Spread de l'état précédent pour maintenir les autres propriétés
      [name]: value // Mise à jour de la propriété spécifique qui a changé
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Réservation soumise pour ${detailsReservation.nomTour} avec ${detailsReservation.voyageurs} voyageur(s) le ${detailsReservation.dateReservation}`);
    // Dans une vraie application, ceci enverrait les données à un backend
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Nom du Tour :
        <input
          type="text"
          name="nomTour"
          value={detailsReservation.nomTour}
          onChange={handleChange}
        />
      </label>
      <br />
      <label>
        Nombre de Voyageurs :
        <input
          type="number"
          name="voyageurs"
          value={detailsReservation.voyageurs}
          onChange={handleChange}
          min="1"
        />
      </label>
      <br />
      <label>
        Date de Réservation :
        <input
          type="date"
          name="dateReservation"
          value={detailsReservation.dateReservation}
          onChange={handleChange}
        />
      </label>
      <br />
      <button type="submit">Confirmer la Réservation</button>
    </form>
  );
}

// Utilisation du FormulaireReservation
function App() {
  return <FormulaireReservation />;
}
```

Le composant `FormulaireReservation` gère son état `detailsReservation`, qui est un objet. La fonction `handleChange` utilise la forme de mise à jour fonctionnelle de `setDetailsReservation` (`detailsPrecedents => ({ ...detailsPrecedents, [name]: value })`) pour fusionner correctement les mises à jour dans l'objet d'état sans mutation.

### État dans les Composants de Classe (Contexte Historique)

Dans les composants de classe, l'état est un objet stocké dans `this.state` et mis à jour en utilisant `this.setState()`. La modification directe de `this.state` en dehors de `this.setState()` est un anti-pattern courant.

```jsx
import React from 'react';

class TourFavori extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tour: "Aucun Tour Favori Sélectionné",
      estEnEdition: false
    };
  }

  updateTour = () => {
    this.setState({
      tour: "Trek au Camp de Base de l'Everest",
      estEnEdition: false
    });
  }

  toggleEdit = () => {
    this.setState(etatPrecedent => ({
      estEnEdition: !etatPrecedent.estEnEdition
    }));
  }

  render() {
    return (
      <div>
        <h2>Mon Tour Favori : {this.state.tour}</h2>
        <button onClick={this.updateTour}>Définir le Tour Favori</button>
        <button onClick={this.toggleEdit}>
          {this.state.estEnEdition ? 'Arrêter l\'Édition' : 'Commencer l\'Édition'}
        </button>
      </div>
    );
  }
}

// Utilisation du composant TourFavori
class App extends React.Component {
  render() {
    return <TourFavori />;
  }
}
```

Le composant `TourFavori` initialise son état dans le constructeur. `this.setState()` est utilisé pour mettre à jour l'état, déclenchant un re-rendu. La méthode `toggleEdit` démontre comment mettre à jour l'état en fonction de sa valeur précédente, ce qui est important pour garantir des mises à jour correctes lorsque plusieurs changements d'état peuvent survenir en succession rapide.

## Exemples Pratiques et Démonstrations

Construisons un composant simple de Liste de Tours pour notre application de tourisme qui affiche plusieurs cartes de tours et permet à un utilisateur de les filtrer.

### Construction d'une Liste de Tours Filtrable

Cet exemple combine composants, props et état pour créer une liste dynamique de tours.

```jsx
import React, { useState } from 'react';

// Composant CarteTour (composant fonctionnel)
function CarteTour({ tour, onSelect }) { // Déstructuration des props pour un accès plus propre
  const handleClick = () => {
    onSelect(tour.id); // Appeler la fonction onSelect passée via les props
  };

  return (
    <div className="tour-card" style={{ border: '1px solid #ccc', margin: '10px', padding: '10px', borderRadius: '5px' }}>
      <h3>{tour.nom}</h3>
      <p>Lieu : {tour.lieu}</p>
      <p>Prix : {tour.prix} €</p>
      <p>Durée : {tour.duree} jour(s)</p>
      <button onClick={handleClick}>Sélectionner le Tour</button>
    </div>
  );
}

// Composant ListeTours (composant fonctionnel gérant l'état pour les filtres)
function ListeTours() {
  // Données de tours d'exemple (proviendraient typiquement d'une API)
  const tousTours = [
    { id: 't1', nom: 'Rome Historique', lieu: 'Rome', prix: 150, duree: 3, type: 'ville' },
    { id: 't2', nom: 'Randonnée Alpine', lieu: 'Alpes Suisses', prix: 300, duree: 5, type: 'aventure' },
    { id: 't3', nom: 'Safari dans le Désert', lieu: 'Dubaï', prix: 200, duree: 2, type: 'aventure' },
    { id: 't4', nom: 'Retraite à la Plage', lieu: 'Maldives', prix: 1200, duree: 7, type: 'plage' },
    { id: 't5', nom: 'Égypte Antique', lieu: 'Le Caire', prix: 400, duree: 4, type: 'histoire' },
  ];

  // État pour contenir le texte de filtre actuel
  const [texteFiltre, setTexteFiltre] = useState('');
  // État pour contenir l'ID du tour sélectionné
  const [idTourSelectionne, setIdTourSelectionne] = useState(null);

  // Filtrer les tours en fonction de texteFiltre
  const toursFiltres = tousTours.filter(tour =>
    tour.nom.toLowerCase().includes(texteFiltre.toLowerCase()) ||
    tour.lieu.toLowerCase().includes(texteFiltre.toLowerCase()) ||
    tour.type.toLowerCase().includes(texteFiltre.toLowerCase())
  );

  const handleFilterChange = (event) => {
    setTexteFiltre(event.target.value); // Mettre à jour l'état texteFiltre
  };

  const handleTourSelection = (tourId) => {
    setIdTourSelectionne(tourId); // Mettre à jour l'état idTourSelectionne
    alert(`Vous avez sélectionné le tour ID : ${tourId}`);
  };

  return (
    <div>
      <h1>Tours Disponibles</h1>
      <input
        type="text"
        placeholder="Filtrer les tours par nom, lieu ou type..."
        value={texteFiltre}
        onChange={handleFilterChange}
        style={{ width: '300px', padding: '8px', margin: '10px 0' }}
      />
      {idTourSelectionne && <p>Tour actuellement sélectionné : <strong>{idTourSelectionne}</strong></p>}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {toursFiltres.length > 0 ? (
          toursFiltres.map(tour => (
            // Passer l'objet tour complet comme prop, et le gestionnaire de sélection
            <CarteTour key={tour.id} tour={tour} onSelect={handleTourSelection} />
          ))
        ) : (
          <p>Aucun tour ne correspond à vos critères de recherche.</p>
        )}
      </div>
    </div>
  );
}

// Composant App racine
function App() {
  return <ListeTours />;
}

export default App;
```

Dans cet exemple :

- `ListeTours` est le composant parent qui contient l'état pour `texteFiltre` et `idTourSelectionne`.
- Il rend un champ de saisie. Lorsque la valeur de l'input change, `handleFilterChange` met à jour l'état `texteFiltre`.
- `toursFiltres` est une valeur dérivée, recalculée chaque fois que `texteFiltre` change, démontrant comment les mises à jour d'état déclenchent des re-rendus et une interface réactive.
- `ListeTours` itère sur `toursFiltres` et rend un `CarteTour` pour chacun.
- `CarteTour` est un composant enfant qui reçoit un objet `tour` et une fonction `onSelect` comme props.
- Lorsque le bouton dans `CarteTour` est cliqué, il appelle `onSelect` (qui est `handleTourSelection` du parent) et transmet son `tour.id` vers le haut, démontrant les props de callback pour la communication parent-enfant.
- L'état `idTourSelectionne` dans `ListeTours` se met à jour, montrant quel tour a été sélectionné en dernier.

## Exercices

1. **Améliorer le composant CarteTour** : Modifiez le composant `CarteTour` dans l'exemple "Construction d'une Liste de Tours Filtrable" pour inclure :
   - Une nouvelle prop appelée `symboleDevise` (par exemple, "$", "€") avec une valeur par défaut de "€".
   - Un élément de rendu conditionnel : Si la `duree` du tour est supérieure à 5 jours, affichez un petit badge qui dit "Long Voyage !" à côté de la durée.
   - Un état interne (`estSurvole`) qui change la couleur de fond du `tour-card` en bleu clair lorsque la souris survole, et revient à blanc lorsqu'elle part. Utilisez les gestionnaires d'événements `onMouseEnter` et `onMouseLeave`.

2. **Ajouter une Fonctionnalité de Tri des Tours à ListeTours** : Étendez le composant `ListeTours` pour inclure un menu déroulant pour trier les tours.
   - Ajoutez une nouvelle variable d'état, `ordreTri`, initialisée à `'aucun'`.
   - Créez un élément `<select>` avec les options : "Aucun Tri", "Prix : Bas vers Haut", "Prix : Haut vers Bas", "Durée : Court vers Long".
   - Lorsque l'utilisateur sélectionne une option de tri, mettez à jour l'état `ordreTri`.
   - Modifiez la logique de `toursFiltres` pour appliquer l'`ordreTri` sélectionné avant de rendre les composants `CarteTour`.
   - Astuce : Vous devrez créer une copie de `toursFiltres` avant de trier pour éviter de muter le tableau original, par exemple, `[...toursFiltres].sort(...)`.

3. **Créer un Composant ConfirmationReservation** : Construisez un nouveau composant fonctionnel appelé `ConfirmationReservation`.
   - Il devrait accepter `nomTour`, `dateReservation` et `voyageurs` comme props.
   - Affichez ces détails dans un format convivial (par exemple, "Votre réservation pour [nomTour] le [dateReservation] pour [voyageurs] personne(s) est confirmée !").
   - Intégrez ceci dans le `FormulaireReservation` de la section "État dans les Composants Fonctionnels". Après la soumission du formulaire, au lieu d'une alerte, mettez à jour une nouvelle variable d'état (`estReserve`) dans `FormulaireReservation`. Si `estReserve` est `true`, rendez le composant `ConfirmationReservation`, en lui passant les détails de réservation comme props. Sinon, rendez le formulaire.

## Conclusion

Les composants, les props et l'état sont les concepts fondamentaux pour construire toute application React. Les composants fournissent la structure, les props permettent un flux de données unidirectionnel du parent vers l'enfant pour la configuration, et l'état permet aux composants de gérer et de réagir aux changements de données dynamiques en interne. Maîtriser ces concepts est crucial pour créer des interfaces utilisateur interactives et maintenables.

À mesure que nous avançons, nous utiliserons ces fondamentaux pour construire les divers micro-frontends de notre application de tourisme, les connecter aux services backend, et appliquer des principes qui garantissent que notre base de code reste robuste et évolutive. Les prochaines leçons se concentreront sur la mise en place d'un environnement de développement fullstack, qui impliquera Node.js, Express et PostgreSQL, fournissant le backend avec lequel nos composants React pourront interagir.
