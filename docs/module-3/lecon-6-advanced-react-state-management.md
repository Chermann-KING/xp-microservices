# Leçon 3.6 - React Avancé : State Management et Hooks Personnalisés

**Module 3** : Principes SOLID, Design Patterns et React Avancé

---

## Objectifs pédagogiques

À la fin de cette leçon, vous serez capable de :

- Comprendre et implémenter le **Context API** pour partager l'état global entre composants React
- Maîtriser le hook **useReducer** pour gérer des logiques d'état complexes
- Combiner **Context API et useReducer** pour créer une solution de state management centralisée
- Créer des **Custom Hooks** réutilisables pour encapsuler la logique métier
- **Composer** hooks et state management pour une architecture React complète
- Évaluer quand utiliser **Redux Toolkit** vs Context API/useReducer
- Appliquer ces patterns au contexte de l'application de réservation touristique avec microservices

---

## Prérequis

- ✅ **Leçon 3.5** - Dependency Inversion Principle (DIP)
- ✅ **Module 1** - React Fundamentals et hooks (`useState`, `useEffect`)
- ✅ Compréhension des composants fonctionnels React
- ✅ Notions de base sur les props et le prop drilling

---

## Durée estimée

⏱️ **~5 heures**

- Partie A: Fondations du State Management (~2h)
- Partie B: Custom Hooks pour la Réutilisabilité (~2h)
- Partie C: Architecture Complète (~1h)

---

## Table des Matières

**PARTIE A: FONDATIONS DU STATE MANAGEMENT**

- [Introduction - Pourquoi le State Management?](#introduction---pourquoi-le-state-management)
- [Context API - Partage d'état sans prop drilling](#context-api---partage-détat-sans-prop-drilling)
- [useReducer - Logique d'état complexe](#usereducer---logique-détat-complexe)
- [Combiner Context + useReducer](#combiner-context--usereducer)
- [Redux Toolkit (survol)](#redux-toolkit-survol)

**PARTIE B: CUSTOM HOOKS POUR LA RÉUTILISABILITÉ**

- [Qu'est-ce qu'un Custom Hook?](#quest-ce-quun-custom-hook)
- [Règles des Hooks](#règles-des-hooks)
- [Patterns essentiels](#patterns-essentiels)
  - [useLocalStorage](#uselocalstorage---persistance-locale)
  - [useDebounce](#usedebounce---optimisation-des-entrées)
  - [useFetch](#usefetch---récupération-de-données)

**PARTIE C: ARCHITECTURE COMPLÈTE**

- [useAuth - Combine Context + Custom Hook](#useauth---authentification-avec-context)
- [useBooking - Logique métier avec State Management](#usebooking---gestion-des-réservations)
- [Container vs Presentational Components](#container-vs-presentational-components)
- [Testing de l'architecture complète](#testing-de-larchitecture-complète)

---

# PARTIE A: FONDATIONS DU STATE MANAGEMENT

## Introduction - Pourquoi le State Management?

La gestion efficace de l'état dans les applications React devient critique à mesure que la complexité augmente, particulièrement dans une architecture fullstack microservices où les composants frontend doivent refléter des données provenant de divers services backend.

Dans notre **application de réservation touristique**, nous devons gérer :

- Les **visites disponibles** (depuis le Tour Catalog Service)
- Les **réservations** en cours (depuis le Booking Management Service)
- L'**authentification utilisateur** (depuis l'Authentication Service)
- Le **panier** de réservation (état local complexe avec plusieurs transitions)

Cette partie explore le **Context API** et le hook **useReducer** de React comme outils puissants pour la gestion d'état avancée.

---

## Context API - Partage d'état sans prop drilling

### Le problème du Prop Drilling

Avant le Context API, partager des données entre composants profondément imbriqués nécessitait de passer les props manuellement à chaque niveau de l'arbre de composants.

```jsx
// ❌ Problème : Prop Drilling
function App() {
  const [user, setUser] = useState(null);

  return <Dashboard user={user} setUser={setUser} />;
}

function Dashboard({ user, setUser }) {
  // Dashboard n'utilise pas user directement mais doit le passer
  return <TourList user={user} setUser={setUser} />;
}

function TourList({ user, setUser }) {
  // TourList n'utilise pas user directement mais doit le passer
  return <TourItem user={user} setUser={setUser} />;
}

function TourItem({ user, setUser }) {
  // Enfin, le composant qui utilise vraiment user !
  return <div>Bienvenue, {user?.name}</div>;
}
```

**Problèmes :**

- Code verbeux et difficile à maintenir
- Composants intermédiaires pollués par des props inutiles
- Difficile de refactoriser la structure des composants

### Solution : Context API

Le **React Context API** fournit un moyen de passer des données à travers l'arbre de composants **sans avoir à passer les props manuellement à chaque niveau**.

### Création d'un Context - Exemple complet

```jsx
// contexts/UserContext.js
import React, { createContext, useState, useContext } from "react";

// 1. Créer le Context
const UserContext = createContext();

// 2. Créer le Provider
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// 3. Hook personnalisé pour consommer le Context
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser doit être utilisé dans un UserProvider");
  }
  return context;
}
```

**Utilisation:**

```jsx
// App.js
import { UserProvider } from "./contexts/UserContext";

function App() {
  return (
    <UserProvider>
      <Dashboard />
    </UserProvider>
  );
}

// components/Dashboard.js
import { useUser } from "../contexts/UserContext";

function Dashboard() {
  const { user, logout } = useUser();

  return (
    <div>
      <h1>Bienvenue, {user?.name || "Invité"}</h1>
      {user && <button onClick={logout}>Déconnexion</button>}
      <TourList />
    </div>
  );
}

// components/TourItem.js
import { useUser } from "../contexts/UserContext";

function TourItem({ tour }) {
  const { user, isAuthenticated } = useUser();

  return (
    <div>
      <h3>{tour.name}</h3>
      <p>{tour.price} USD</p>
      {isAuthenticated ? (
        <button>Réserver maintenant</button>
      ) : (
        <button disabled>Connectez-vous pour réserver</button>
      )}
    </div>
  );
}
```

✅ **Avantages du Context API:**

- Pas de prop drilling
- Code plus propre et maintenable
- Facilite le refactoring
- Performance acceptable pour la plupart des cas d'usage

---

## useReducer - Logique d'état complexe

Lorsque la logique d'état devient complexe avec plusieurs actions possibles, **useReducer** offre une alternative plus structurée à `useState`.

### Concept

`useReducer` suit le pattern Redux : **état + action → nouvel état**

```javascript
const [state, dispatch] = useReducer(reducer, initialState);
```

### Exemple : Panier de réservation

```jsx
// reducers/cartReducer.js

// États possibles du panier
const initialState = {
  items: [],
  totalPrice: 0,
  currency: "USD",
};

// Types d'actions
export const CART_ACTIONS = {
  ADD_TOUR: "ADD_TOUR",
  REMOVE_TOUR: "REMOVE_TOUR",
  UPDATE_PARTICIPANTS: "UPDATE_PARTICIPANTS",
  CLEAR_CART: "CLEAR_CART",
  SET_CURRENCY: "SET_CURRENCY",
};

// Reducer: fonction pure qui calcule le nouvel état
export function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.ADD_TOUR:
      const newItem = {
        tourId: action.payload.tourId,
        tourName: action.payload.tourName,
        price: action.payload.price,
        participants: action.payload.participants || 1,
        date: action.payload.date,
      };

      return {
        ...state,
        items: [...state.items, newItem],
        totalPrice: state.totalPrice + newItem.price * newItem.participants,
      };

    case CART_ACTIONS.REMOVE_TOUR:
      const itemToRemove = state.items.find(
        (item) => item.tourId === action.payload.tourId
      );
      if (!itemToRemove) return state;

      return {
        ...state,
        items: state.items.filter(
          (item) => item.tourId !== action.payload.tourId
        ),
        totalPrice:
          state.totalPrice - itemToRemove.price * itemToRemove.participants,
      };

    case CART_ACTIONS.UPDATE_PARTICIPANTS:
      return {
        ...state,
        items: state.items.map((item) =>
          item.tourId === action.payload.tourId
            ? { ...item, participants: action.payload.participants }
            : item
        ),
        totalPrice: state.items.reduce((total, item) => {
          if (item.tourId === action.payload.tourId) {
            return total + item.price * action.payload.participants;
          }
          return total + item.price * item.participants;
        }, 0),
      };

    case CART_ACTIONS.CLEAR_CART:
      return initialState;

    case CART_ACTIONS.SET_CURRENCY:
      return {
        ...state,
        currency: action.payload.currency,
      };

    default:
      return state;
  }
}
```

**Utilisation dans un composant:**

```jsx
// components/ShoppingCart.js
import React, { useReducer } from "react";
import { cartReducer, CART_ACTIONS } from "../reducers/cartReducer";

function ShoppingCart() {
  const [cart, dispatch] = useReducer(cartReducer, {
    items: [],
    totalPrice: 0,
    currency: "USD",
  });

  const handleAddTour = (tour) => {
    dispatch({
      type: CART_ACTIONS.ADD_TOUR,
      payload: {
        tourId: tour.id,
        tourName: tour.name,
        price: tour.price,
        participants: 1,
        date: new Date().toISOString(),
      },
    });
  };

  const handleRemoveTour = (tourId) => {
    dispatch({
      type: CART_ACTIONS.REMOVE_TOUR,
      payload: { tourId },
    });
  };

  const handleClearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  };

  return (
    <div>
      <h2>🛒 Panier de réservation</h2>

      {cart.items.length === 0 ? (
        <p>Votre panier est vide</p>
      ) : (
        <>
          <ul>
            {cart.items.map((item) => (
              <li key={item.tourId}>
                <strong>{item.tourName}</strong> - {item.price} {cart.currency}
                <br />
                Participants: {item.participants}
                <br />
                <button onClick={() => handleRemoveTour(item.tourId)}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>

          <p>
            <strong>
              Total: {cart.totalPrice} {cart.currency}
            </strong>
          </p>

          <button onClick={handleClearCart}>Vider le panier</button>
          <button>Procéder au paiement</button>
        </>
      )}
    </div>
  );
}

export default ShoppingCart;
```

✅ **Quand utiliser useReducer?**

- Logique d'état complexe avec multiples sous-valeurs
- Transitions d'état multiples
- État suivant dépend de l'état précédent
- Besoin de tester la logique d'état de manière isolée

---

## Combiner Context + useReducer

La vraie puissance émerge quand on combine **Context API** et **useReducer** pour créer un state management centralisé.

### Exemple complet : CartContext

```jsx
// contexts/CartContext.js
import React, { createContext, useContext, useReducer } from "react";

// Reducer
const CART_ACTIONS = {
  ADD_TOUR: "ADD_TOUR",
  REMOVE_TOUR: "REMOVE_TOUR",
  UPDATE_PARTICIPANTS: "UPDATE_PARTICIPANTS",
  CLEAR_CART: "CLEAR_CART",
};

const initialState = {
  items: [],
  totalPrice: 0,
  currency: "USD",
};

function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.ADD_TOUR: {
      const newItem = action.payload;
      const itemCost = newItem.price * newItem.participants;

      return {
        ...state,
        items: [...state.items, newItem],
        totalPrice: state.totalPrice + itemCost,
      };
    }

    case CART_ACTIONS.REMOVE_TOUR: {
      const itemToRemove = state.items.find(
        (i) => i.tourId === action.payload.tourId
      );
      if (!itemToRemove) return state;

      return {
        ...state,
        items: state.items.filter((i) => i.tourId !== action.payload.tourId),
        totalPrice:
          state.totalPrice - itemToRemove.price * itemToRemove.participants,
      };
    }

    case CART_ACTIONS.CLEAR_CART:
      return initialState;

    default:
      return state;
  }
}

// Context
const CartContext = createContext();

// Provider
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  // Actions helpers
  const addTour = (tour, participants = 1) => {
    dispatch({
      type: CART_ACTIONS.ADD_TOUR,
      payload: {
        tourId: tour.id,
        tourName: tour.name,
        price: tour.price,
        participants,
        date: new Date().toISOString(),
      },
    });
  };

  const removeTour = (tourId) => {
    dispatch({
      type: CART_ACTIONS.REMOVE_TOUR,
      payload: { tourId },
    });
  };

  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  };

  const value = {
    cart,
    addTour,
    removeTour,
    clearCart,
    itemCount: cart.items.length,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Hook personnalisé
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart doit être utilisé dans un CartProvider");
  }
  return context;
}
```

**Utilisation:**

```jsx
// App.js
import { CartProvider } from "./contexts/CartContext";

function App() {
  return (
    <CartProvider>
      <TourCatalog />
      <ShoppingCart />
    </CartProvider>
  );
}

// components/TourCatalog.js
import { useState } from "react";
import { useCart } from "../contexts/CartContext";

function TourCatalog() {
  const { addTour } = useCart();
  const [tours, setTours] = useState([]);

  // Charger les tours depuis l'API...

  return (
    <div>
      <h2>Visites disponibles</h2>
      {tours.map((tour) => (
        <div key={tour.id}>
          <h3>{tour.name}</h3>
          <p>{tour.price} USD</p>
          <button onClick={() => addTour(tour, 2)}>
            Ajouter au panier (2 personnes)
          </button>
        </div>
      ))}
    </div>
  );
}

// components/ShoppingCart.js
import { useCart } from "../contexts/CartContext";

function ShoppingCart() {
  const { cart, removeTour, clearCart, itemCount } = useCart();

  return (
    <div>
      <h2>🛒 Panier ({itemCount} articles)</h2>

      {cart.items.map((item) => (
        <div key={item.tourId}>
          <p>
            {item.tourName} - {item.participants} participants
          </p>
          <button onClick={() => removeTour(item.tourId)}>Retirer</button>
        </div>
      ))}

      <p>Total: {cart.totalPrice} USD</p>
      <button onClick={clearCart}>Vider le panier</button>
    </div>
  );
}
```

✅ **Pattern Context + useReducer:**

- ✅ État global centralisé
- ✅ Logique métier dans le reducer (testable isolément)
- ✅ API simple via hook personnalisé
- ✅ Performance optimale avec React.memo si nécessaire

---

## Redux Toolkit (survol)

Pour les **grandes applications** avec beaucoup d'état partagé, **Redux Toolkit** est la solution recommandée.

### Quand utiliser Redux Toolkit?

| Critère          | Context + useReducer | Redux Toolkit           |
| ---------------- | -------------------- | ----------------------- |
| **Taille app**   | Petite/Moyenne       | Grande                  |
| **État partagé** | < 5 contextes        | > 5 slices              |
| **DevTools**     | Limités              | Puissants (time-travel) |
| **Middleware**   | Custom               | Intégré (thunk, saga)   |
| **Performance**  | Bonne                | Optimisée               |

### Exemple Redux Toolkit (aperçu)

```javascript
// store/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: [],
    totalPrice: 0,
  },
  reducers: {
    addTour: (state, action) => {
      // Redux Toolkit utilise Immer : mutations directes OK!
      state.items.push(action.payload);
      state.totalPrice += action.payload.price * action.payload.participants;
    },
    removeTour: (state, action) => {
      const index = state.items.findIndex((i) => i.tourId === action.payload);
      if (index !== -1) {
        const item = state.items[index];
        state.totalPrice -= item.price * item.participants;
        state.items.splice(index, 1);
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.totalPrice = 0;
    },
  },
});

export const { addTour, removeTour, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
```

```javascript
// store/index.js
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./cartSlice";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
});
```

```jsx
// App.js
import { Provider } from "react-redux";
import { store } from "./store";

function App() {
  return (
    <Provider store={store}>
      <TourCatalog />
    </Provider>
  );
}

// components/TourCatalog.js
import { useDispatch, useSelector } from "react-redux";
import { addTour } from "../store/cartSlice";

function TourCatalog() {
  const dispatch = useDispatch();
  const itemCount = useSelector((state) => state.cart.items.length);

  const handleAddTour = (tour) => {
    dispatch(
      addTour({
        tourId: tour.id,
        tourName: tour.name,
        price: tour.price,
        participants: 1,
      })
    );
  };

  return (
    <div>
      <h2>Visites ({itemCount} dans le panier)</h2>
      {/* ... */}
    </div>
  );
}
```

**💡 Recommandation:**

- Commencez avec **Context + useReducer**
- Migrez vers **Redux Toolkit** si vous ressentez les limites (performance, DevTools, middleware)

---

# PARTIE B: CUSTOM HOOKS POUR LA RÉUTILISABILITÉ

## Qu'est-ce qu'un Custom Hook?

Un **Custom Hook** est une fonction JavaScript dont le nom commence par `use` et qui peut appeler d'autres hooks React.

Les Custom Hooks permettent d'**extraire la logique de composants** et de la **réutiliser** entre plusieurs composants sans dupliquer le code.

### Exemple simple : useCounter

```jsx
// hooks/useCounter.js
import { useState } from "react";

function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}

export default useCounter;
```

**Utilisation:**

```jsx
// components/CounterDemo.js
import useCounter from "../hooks/useCounter";

function CounterDemo() {
  const { count, increment, decrement, reset } = useCounter(0);

  return (
    <div>
      <h2>Compteur: {count}</h2>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Réinitialiser</button>
    </div>
  );
}
```

✅ **Avantages:**

- Logique réutilisable entre composants
- Code plus lisible et maintenable
- Séparation des préoccupations (SRP)
- Facilite les tests unitaires

---

## Règles des Hooks

Les Custom Hooks doivent respecter les **Rules of Hooks**:

1. **Appeler uniquement au top level** - Ne pas appeler dans des boucles, conditions ou fonctions imbriquées
2. **Appeler uniquement depuis des fonctions React** - Composants fonctionnels ou autres Custom Hooks
3. **Nommer avec le préfixe `use`** - Permet à React de détecter les violations de règles

```jsx
// ❌ INCORRECT
function BadComponent() {
  if (someCondition) {
    const [state, setState] = useState(0); // Violation : hook dans condition
  }
  return <div>{state}</div>;
}

// ✅ CORRECT
function GoodComponent() {
  const [state, setState] = useState(0);

  if (someCondition) {
    setState(10); // OK : appel de fonction de mise à jour
  }

  return <div>{state}</div>;
}
```

---

## Patterns essentiels

### useLocalStorage - Persistance locale

Un hook pour synchroniser l'état React avec le localStorage.

```jsx
// hooks/useLocalStorage.js
import { useState, useEffect } from "react";

function useLocalStorage(key, initialValue) {
  // Fonction pour récupérer la valeur initiale depuis localStorage
  const getStoredValue = () => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erreur lecture localStorage clé "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState(getStoredValue);

  // Fonction pour mettre à jour à la fois l'état et localStorage
  const setValue = (value) => {
    try {
      // Permettre value d'être une fonction comme useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Erreur écriture localStorage clé "${key}":`, error);
    }
  };

  // Synchroniser avec localStorage si la valeur change dans un autre onglet
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
```

**Utilisation:**

```jsx
// components/UserPreferences.js
import useLocalStorage from "../hooks/useLocalStorage";

function UserPreferences() {
  const [currency, setCurrency] = useLocalStorage("currency", "USD");
  const [theme, setTheme] = useLocalStorage("theme", "light");
  const [language, setLanguage] = useLocalStorage("language", "fr");

  return (
    <div>
      <h3>⚙️ Préférences utilisateur</h3>

      <div>
        <label>Devise: </label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
        </select>
      </div>

      <div>
        <label>Thème: </label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">Clair</option>
          <option value="dark">Sombre</option>
        </select>
      </div>

      <div>
        <label>Langue: </label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      <p>Les préférences sont sauvegardées automatiquement!</p>
    </div>
  );
}
```

---

### useDebounce - Optimisation des entrées

Un hook pour retarder la mise à jour d'une valeur (utile pour les recherches).

```jsx
// hooks/useDebounce.js
import { useState, useEffect } from "react";

function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Créer un timer qui met à jour la valeur debounced après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si value change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
```

**Utilisation pour une recherche de visites:**

```jsx
// components/TourSearch.js
import React, { useState, useEffect } from "react";
import useDebounce from "../hooks/useDebounce";

function TourSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Valeur debounced : ne change que 500ms après la dernière frappe
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      setIsSearching(true);

      // Appel API au Tour Catalog Service
      fetch(
        `http://localhost:3001/api/v1/tours-catalog/tours?search=${debouncedSearchTerm}`
      )
        .then((response) => response.json())
        .then((data) => {
          setResults(data.data);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("Erreur de recherche:", err);
          setIsSearching(false);
        });
    } else {
      setResults([]);
    }
  }, [debouncedSearchTerm]);

  return (
    <div>
      <h3>🔍 Rechercher des visites</h3>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Rechercher Wakanda, Asgard, Stark Tower..."
        style={{ width: "100%", padding: "10px" }}
      />

      {isSearching && <p>Recherche dans la base J.A.R.V.I.S...</p>}

      {results.length > 0 && (
        <ul>
          {results.map((tour) => (
            <li key={tour.id}>
              <strong>{tour.name}</strong> - {tour.price} USD
            </li>
          ))}
        </ul>
      )}

      {!isSearching && searchTerm && results.length === 0 && (
        <p>Aucune visite trouvée pour "{searchTerm}"</p>
      )}
    </div>
  );
}

export default TourSearch;
```

✅ **Avantage:** Évite d'envoyer une requête API à chaque frappe de touche (optimisation performance + coûts API).

---

### useFetch - Récupération de données

Un hook générique pour récupérer des données depuis les microservices.

```jsx
// hooks/useFetch.js
import { useState, useEffect, useCallback } from "react";

function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fonction pour refetch manuellement
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}

export default useFetch;
```

**Utilisation:**

```jsx
// components/TourList.js
import useFetch from "../hooks/useFetch";

function TourList() {
  const {
    data: tours,
    isLoading,
    error,
    refetch,
  } = useFetch("http://localhost:3001/api/v1/tours-catalog/tours");

  if (isLoading) return <p>Chargement des visites Stark Industries...</p>;
  if (error) return <p>Erreur: {error}</p>;

  return (
    <div>
      <h2>Visites disponibles</h2>
      <button onClick={refetch}>Actualiser</button>
      <ul>
        {tours?.map((tour) => (
          <li key={tour.id}>
            <strong>{tour.name}</strong> - {tour.price} USD
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

# PARTIE C: ARCHITECTURE COMPLÈTE

## useAuth - Authentification avec Context

Maintenant, combinons tout ce que nous avons appris : **Context**, **useReducer**, et **Custom Hooks**.

### AuthContext avec reducer

```jsx
// contexts/AuthContext.js
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";

// Actions
const AUTH_ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  SET_USER: "SET_USER",
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
        isAuthenticated: false,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: !!action.payload.user,
        isLoading: false,
      };

    default:
      return state;
  }
}

// État initial
const initialState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// Context
const AuthContext = createContext();

// Provider
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Vérifier si un utilisateur est déjà connecté au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          return;
        }

        // Valider le token avec le Authentication Service
        const response = await fetch(
          "http://localhost:3004/api/v1/auth/verify",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const userData = await response.json();
          dispatch({
            type: AUTH_ACTIONS.SET_USER,
            payload: { user: userData.data.user },
          });
        } else {
          localStorage.removeItem("authToken");
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } catch (err) {
        console.error("Erreur vérification auth:", err);
        localStorage.removeItem("authToken");
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    };

    checkAuth();
  }, []);

  // Fonction de login
  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await fetch("http://localhost:3004/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Identifiants invalides");
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.data.token);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: data.data.user },
      });

      return { success: true };
    } catch (err) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: err.message },
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Fonction de logout
  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  }, []);

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = useCallback(
    (role) => {
      return state.user?.roles?.includes(role) || false;
    },
    [state.user]
  );

  const value = {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}
```

**Utilisation:**

```jsx
// components/LoginForm.js
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function LoginForm() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      console.log("✅ Connexion réussie!");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Connexion</h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email de Tony Stark"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
      />

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Connexion..." : "Se connecter"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
```

---

## useBooking - Gestion des réservations

Un hook complexe combinant logique métier et appels API.

```jsx
// hooks/useBooking.js
import { useState, useCallback } from "react";

function useBooking() {
  const [bookings, setBookings] = useState([]);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Créer une nouvelle réservation
  const createBooking = useCallback(async (bookingData) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "http://localhost:3002/api/v1/booking-management/bookings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec création réservation");
      }

      const result = await response.json();
      const newBooking = result.data.booking;

      setBookings((prev) => [...prev, newBooking]);
      setCurrentBooking(newBooking);

      return { success: true, booking: newBooking };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Récupérer les réservations de l'utilisateur
  const fetchUserBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "http://localhost:3002/api/v1/booking-management/bookings",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Échec récupération réservations");
      }

      const result = await response.json();
      setBookings(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Annuler une réservation
  const cancelBooking = useCallback(async (bookingId) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:3002/api/v1/booking-management/bookings/${bookingId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      if (!response.ok) {
        throw new Error("Échec annulation");
      }

      const result = await response.json();

      // Mettre à jour l'état local
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? result.data.booking : b))
      );

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculer le montant total de toutes les réservations
  const getTotalSpent = useCallback(() => {
    return bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((acc, booking) => acc + booking.totalPrice, 0);
  }, [bookings]);

  return {
    bookings,
    currentBooking,
    isLoading,
    error,
    createBooking,
    fetchUserBookings,
    cancelBooking,
    getTotalSpent,
  };
}

export default useBooking;
```

**Utilisation:**

```jsx
// components/BookingDashboard.js
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import useBooking from "../hooks/useBooking";

function BookingDashboard() {
  const { user } = useAuth();
  const {
    bookings,
    isLoading,
    error,
    fetchUserBookings,
    cancelBooking,
    getTotalSpent,
  } = useBooking();

  useEffect(() => {
    if (user) {
      fetchUserBookings();
    }
  }, [user, fetchUserBookings]);

  const handleCancel = async (bookingId) => {
    const result = await cancelBooking(bookingId);
    if (result.success) {
      alert("Réservation annulée avec succès!");
    }
  };

  if (isLoading) return <p>Chargement des réservations...</p>;
  if (error) return <p>Erreur: {error}</p>;

  return (
    <div>
      <h2>📋 Vos réservations</h2>
      <p>Total dépensé: {getTotalSpent().toFixed(2)} USD</p>

      {bookings.length === 0 ? (
        <p>Aucune réservation. Explorez nos visites!</p>
      ) : (
        <ul>
          {bookings.map((booking) => (
            <li key={booking.id}>
              <strong>Réservation #{booking.id.slice(0, 8)}</strong>
              <br />
              Statut: {booking.status}
              <br />
              Total: {booking.totalPrice} USD
              <br />
              {booking.status === "confirmed" && (
                <button onClick={() => handleCancel(booking.id)}>
                  Annuler
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Container vs Presentational Components

Un pattern architectural important pour séparer **logique** et **présentation**.

### Presentational Component (Présentation pure)

```jsx
// components/TourCard.js
function TourCard({ tour, onAddToCart, isInCart }) {
  return (
    <div className="tour-card">
      <img src={tour.imageUrl} alt={tour.name} />
      <h3>{tour.name}</h3>
      <p>{tour.description}</p>
      <p className="price">{tour.price} USD</p>

      <button onClick={() => onAddToCart(tour)} disabled={isInCart}>
        {isInCart ? "Dans le panier" : "Ajouter au panier"}
      </button>
    </div>
  );
}

export default TourCard;
```

### Container Component (Logique)

```jsx
// components/TourCardContainer.js
import { useCart } from "../contexts/CartContext";
import TourCard from "./TourCard";

function TourCardContainer({ tour }) {
  const { cart, addTour } = useCart();

  const isInCart = cart.items.some((item) => item.tourId === tour.id);

  const handleAddToCart = (tour) => {
    addTour(tour, 1);
  };

  return (
    <TourCard tour={tour} onAddToCart={handleAddToCart} isInCart={isInCart} />
  );
}

export default TourCardContainer;
```

✅ **Avantages:**

- **Presentational** : facile à tester, réutilisable, pur
- **Container** : gère la logique, état, effets de bord
- Séparation claire des responsabilités (SRP!)

---

## Testing de l'architecture complète

### Tester un reducer

```javascript
// __tests__/cartReducer.test.js
import { cartReducer, CART_ACTIONS } from "../reducers/cartReducer";

describe("cartReducer", () => {
  const initialState = {
    items: [],
    totalPrice: 0,
    currency: "USD",
  };

  test("ajoute une visite au panier", () => {
    const action = {
      type: CART_ACTIONS.ADD_TOUR,
      payload: {
        tourId: "t1",
        tourName: "Visite de Wakanda",
        price: 500,
        participants: 2,
      },
    };

    const newState = cartReducer(initialState, action);

    expect(newState.items).toHaveLength(1);
    expect(newState.items[0].tourName).toBe("Visite de Wakanda");
    expect(newState.totalPrice).toBe(1000); // 500 * 2
  });

  test("retire une visite du panier", () => {
    const stateWithItem = {
      items: [
        {
          tourId: "t1",
          tourName: "Visite de Wakanda",
          price: 500,
          participants: 2,
        },
      ],
      totalPrice: 1000,
      currency: "USD",
    };

    const action = {
      type: CART_ACTIONS.REMOVE_TOUR,
      payload: { tourId: "t1" },
    };

    const newState = cartReducer(stateWithItem, action);

    expect(newState.items).toHaveLength(0);
    expect(newState.totalPrice).toBe(0);
  });
});
```

### Tester un Custom Hook

```javascript
// __tests__/useLocalStorage.test.js
import { renderHook, act } from "@testing-library/react-hooks";
import useLocalStorage from "../hooks/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("initialise avec la valeur par défaut", () => {
    const { result } = renderHook(() => useLocalStorage("test", "default"));
    expect(result.current[0]).toBe("default");
  });

  test("sauvegarde dans localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test", "initial"));

    act(() => {
      result.current[1]("nouvelle valeur");
    });

    expect(result.current[0]).toBe("nouvelle valeur");
    expect(localStorage.getItem("test")).toBe(
      JSON.stringify("nouvelle valeur")
    );
  });

  test("récupère depuis localStorage au chargement", () => {
    localStorage.setItem("test", JSON.stringify("valeur stockée"));

    const { result } = renderHook(() => useLocalStorage("test", "default"));

    expect(result.current[0]).toBe("valeur stockée");
  });
});
```

### Tester un composant avec Context

```javascript
// __tests__/TourCard.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider } from "../contexts/CartContext";
import TourCardContainer from "../components/TourCardContainer";

const mockTour = {
  id: "t1",
  name: "Visite de Wakanda",
  description: "Découvrez la technologie vibranium",
  price: 500,
  imageUrl: "/wakanda.jpg",
};

function renderWithProviders(component) {
  return render(<CartProvider>{component}</CartProvider>);
}

describe("TourCardContainer", () => {
  test("ajoute la visite au panier au clic", () => {
    renderWithProviders(<TourCardContainer tour={mockTour} />);

    const button = screen.getByText("Ajouter au panier");
    fireEvent.click(button);

    expect(screen.getByText("Dans le panier")).toBeInTheDocument();
  });
});
```

---

## Exercices Pratiques

### Exercice 1: useCurrency Hook avec Context

**Objectif:** Créer un hook et Context pour gérer la conversion de devises globalement.

**Tâches:**

1. Créer `contexts/CurrencyContext.js` avec useReducer
2. Créer `hooks/useCurrency.js`
3. Implémenter conversion USD → EUR, GBP
4. Persister la devise dans localStorage
5. Ajouter un composant `CurrencySelector` permettant de changer de devise
6. Mettre à jour `BookingCart.js` et `TourItem.js` pour afficher les prix formatés selon la devise sélectionnée

**Structure attendue:**

```jsx
const { currency, setCurrency, convertPrice, formatPrice } = useCurrency();
```

---

### Exercice 2: Panier avec Save for Later + LocalStorage

**Objectif:** Étendre le panier de réservations avec la fonctionnalité "Enregistrer pour plus tard" et persistance localStorage.

**Tâches:**

1. Modifier `cart-reducer.js` pour inclure de nouvelles actions `TOGGLE_SAVED_FOR_LATER` et `MOVE_TO_CART`
2. Ajouter un tableau `savedForLater: []` dans l'état initial du panier
3. Mettre à jour `ShoppingCart.js` avec un bouton "Save for Later" / "Move to Cart" pour chaque item
4. Étendre le `CartContext` pour sauvegarder l'état complet dans localStorage
5. Restaurer le panier (items actifs + saved for later) au rechargement de la page
6. Créer des composants Container/Presentational pour séparer logique et UI

**Indice pour le reducer:**

```javascript
case CART_ACTIONS.TOGGLE_SAVED_FOR_LATER:
  const itemToSave = state.items.find(item => item.tourId === action.payload.tourId);
  if (!itemToSave) return state;
  return {
    ...state,
    items: state.items.filter(item => item.tourId !== action.payload.tourId),
    savedForLater: [...state.savedForLater, itemToSave],
    totalPrice: state.totalPrice - (itemToSave.price * itemToSave.participants),
  };

case CART_ACTIONS.MOVE_TO_CART:
  const itemToMove = state.savedForLater.find(item => item.tourId === action.payload.tourId);
  if (!itemToMove) return state;
  return {
    ...state,
    savedForLater: state.savedForLater.filter(item => item.tourId !== action.payload.tourId),
    items: [...state.items, itemToMove],
    totalPrice: state.totalPrice + (itemToMove.price * itemToMove.participants),
  };
```

---

### Exercice 3: Tour Search avec useReducer et Context

**Objectif:** Implémenter un système de recherche global pour filtrer les visites par terme de recherche et catégorie.

**Tâches:**

1. Créer un `TourSearchContext` qui utilise `useReducer` pour gérer l'état de recherche : `{ query: '', category: 'all' }`
2. Le reducer doit gérer les actions `SET_QUERY` et `SET_CATEGORY`
3. Créer un `TourSearchProvider` qui enveloppe `TourList` et ses composants parents
4. Modifier `TourList.js` pour consommer l'état de recherche et dispatcher les actions
5. Implémenter la logique de filtrage qui utilise `query` et `category` du `TourSearchContext` pour filtrer `allTours` avant le rendu
6. Considérer comment cela diffère de `TourFilter` (filtre autonome) vs recherche globale via context

**Structure attendue:**

```jsx
// TourSearchContext
const initialState = { query: '', category: 'all' };

// Actions
const SEARCH_ACTIONS = {
  SET_QUERY: 'SET_QUERY',
  SET_CATEGORY: 'SET_CATEGORY',
};

// Utilisation dans TourList
const { searchState, setQuery, setCategory } = useTourSearch();
const filteredTours = allTours.filter(tour => /* filtrage basé sur searchState */);
```

---

### Exercice 4: useNotifications Hook

**Objectif:** Créer un système de notifications toast réutilisable.

**Tâches:**

1. Créer `contexts/NotificationContext.js` avec useReducer pour gérer la pile de notifications
2. Créer `hooks/useNotifications.js` comme interface simplifiée
3. Implémenter `showSuccess`, `showError`, `showInfo`, `showWarning`
4. Auto-dismiss après 5 secondes (configurable)
5. Permettre l'empilement de plusieurs notifications simultanées
6. Créer un composant `NotificationContainer` pour afficher les toasts

**Structure attendue:**

```jsx
const { showSuccess, showError, showInfo, showWarning, dismiss } =
  useNotifications();

const handleBooking = async () => {
  const result = await createBooking(data);
  if (result.success) {
    showSuccess("Réservation créée avec succès!");
  } else {
    showError(result.error);
  }
};
```

---

## Points Clés à Retenir

| Concept                      | Description                          | Cas d'usage                           |
| ---------------------------- | ------------------------------------ | ------------------------------------- |
| **Context API**              | Partage d'état sans prop drilling    | Auth, thème, préférences              |
| **useReducer**               | Logique d'état complexe avec actions | Panier, formulaires multi-étapes      |
| **Context + useReducer**     | State management centralisé          | Alternative légère à Redux            |
| **Custom Hooks**             | Logique réutilisable                 | Fetch, localStorage, debounce         |
| **useAuth**                  | Authentification globale             | Context + reducer + hooks             |
| **Container/Presentational** | Séparation logique/UI                | Composants testables et réutilisables |
| **Redux Toolkit**            | State management grandes apps        | > 5 contextes, DevTools, middleware   |

---

## Bonnes Pratiques

### 1. Granularité des Contexts

❌ **Éviter:** Un seul Context géant

```jsx
// Mauvais : tout dans un Context
<AppContext.Provider value={{ user, cart, theme, currency, bookings }}>
```

✅ **Préférer:** Multiples Contexts focalisés

```jsx
// Bon : Contexts séparés par domaine
<AuthProvider>
  <CartProvider>
    <CurrencyProvider>
      <App />
    </CurrencyProvider>
  </CartProvider>
</AuthProvider>
```

### 2. Mémoïsation des valeurs Context

```jsx
// ✅ Bon : mémoïser la valeur du Context
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  const value = useMemo(
    () => ({
      cart,
      addTour: (tour) => dispatch({ type: "ADD_TOUR", payload: tour }),
      removeTour: (id) => dispatch({ type: "REMOVE_TOUR", payload: id }),
    }),
    [cart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
```

### 3. Nommage des Custom Hooks

- ✅ `useAuth`, `useFetch`, `useLocalStorage`
- ❌ `getAuth`, `fetchData`, `storage`

### 4. Composition de Hooks

```jsx
// ✅ Composer des hooks pour créer des abstractions puissantes
function useFetchWithCache(url) {
  const { data, isLoading, error, refetch } = useFetch(url);
  const [cachedData, setCachedData] = useLocalStorage(`cache-${url}`, null);

  useEffect(() => {
    if (data) setCachedData(data);
  }, [data, setCachedData]);

  return {
    data: data || cachedData,
    isLoading,
    error,
    refetch,
    isCached: !data && !!cachedData,
  };
}
```

---

## Conclusion

Dans cette leçon, vous avez appris à construire une **architecture React complète et maintenable** en combinant:

**✅ State Management:**

- Context API pour partager l'état sans prop drilling
- useReducer pour logique d'état complexe
- Context + useReducer comme alternative à Redux
- Redux Toolkit pour grandes applications

**✅ Custom Hooks:**

- Extraction de logique réutilisable
- Patterns essentiels (localStorage, debounce, fetch)
- Composition de hooks

**✅ Architecture Complète:**

- useAuth combinant Context + hooks
- useBooking pour logique métier
- Container vs Presentational components
- Testing complet

**🎯 Application aux Microservices:**

Ces patterns sont **essentiels** dans une architecture microservices car ils permettent de:

- Gérer l'authentification entre services
- Synchroniser l'état frontend avec multiples services backend
- Encapsuler les appels API dans des hooks réutilisables
- Tester la logique métier isolément

**Dans le Module 4**, nous appliquerons ces concepts au **Payment Processing Service** et à la **sécurité**, où la gestion d'état robuste et les hooks personnalisés seront cruciaux pour manipuler les données sensibles.

---

## Navigation

- **⬅️ Précédent:** [Leçon 3.5 - Dependency Inversion Principle (DIP)](lecon-5-dependency-inversion-principle.md)
- **➡️ Suivant:** Module 4 - Payment Processing and Security (à venir)
- **🏠 Retour:** [Sommaire du Module 3](README.md)

---

## Ressources Complémentaires

### Documentation Officielle

- [React Context API](https://react.dev/reference/react/createContext)
- [useReducer Hook](https://react.dev/reference/react/useReducer)
- [Building Your Own Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Redux Toolkit Official Docs](https://redux-toolkit.js.org/)

### Articles et Tutoriels

- [When to use Context vs Redux](https://blog.isquaredsoftware.com/2021/01/context-redux-differences/)
- [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/)
- [Modern Redux with Redux Toolkit](https://redux-toolkit.js.org/tutorials/quick-start)

### Librairies utiles

- [react-use](https://github.com/streamich/react-use) - Collection de Custom Hooks
- [usehooks-ts](https://usehooks-ts.com/) - Custom Hooks en TypeScript
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)

### Vidéos

- [React Context & Hooks Tutorial](https://www.youtube.com/results?search_query=react+context+hooks+tutorial)
- [Redux Toolkit Tutorial](https://www.youtube.com/results?search_query=redux+toolkit+tutorial)

---

**Félicitations! Vous maîtrisez maintenant React avancé avec State Management et Custom Hooks! 🚀**
