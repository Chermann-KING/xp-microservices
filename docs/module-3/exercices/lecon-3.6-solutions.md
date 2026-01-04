# Solutions des Exercices - Leçon 3.6 : React Avancé - State Management et Hooks Personnalisés

**Module 3** : Principes SOLID, Design Patterns et React Avancé

---

## Table des Matières

- [Exercice 1 : useCurrency Hook avec Context](#exercice-1--usecurrency-hook-avec-context)
- [Exercice 2 : Panier avec Save for Later + LocalStorage](#exercice-2--panier-avec-save-for-later--localstorage)
- [Exercice 3 : Tour Search avec useReducer et Context](#exercice-3--tour-search-avec-usereducer-et-context)
- [Exercice 4 : useNotifications Hook](#exercice-4--usenotifications-hook)

---

## Exercice 1 : useCurrency Hook avec Context

### Objectif

Créer un hook et Context pour gérer la conversion de devises globalement dans l'application touristique. L'utilisateur peut choisir sa devise préférée (USD, EUR, GBP) et tous les prix sont automatiquement convertis.

### Étape 1 : Créer le reducer de devises

```javascript
// ===== reducers/currency-reducer.js =====

/**
 * Taux de change (en production, ces valeurs viendraient d'une API)
 * Base : USD
 */
export const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
  CAD: 1.36,
};

/**
 * Symboles de devises
 */
export const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CHF: "CHF",
  CAD: "CA$",
};

/**
 * Noms complets des devises
 */
export const CURRENCY_NAMES = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  CHF: "Swiss Franc",
  CAD: "Canadian Dollar",
};

/**
 * État initial
 */
export const initialCurrencyState = {
  currentCurrency: "USD",
  rates: EXCHANGE_RATES,
  lastUpdated: null,
  isLoading: false,
  error: null,
};

/**
 * Actions du reducer
 */
export const CURRENCY_ACTIONS = {
  SET_CURRENCY: "set_currency",
  UPDATE_RATES: "update_rates",
  SET_LOADING: "set_loading",
  SET_ERROR: "set_error",
};

/**
 * Reducer pour la gestion des devises
 */
function currencyReducer(state, action) {
  switch (action.type) {
    case CURRENCY_ACTIONS.SET_CURRENCY:
      return {
        ...state,
        currentCurrency: action.payload,
      };

    case CURRENCY_ACTIONS.UPDATE_RATES:
      return {
        ...state,
        rates: action.payload.rates,
        lastUpdated: action.payload.timestamp,
        isLoading: false,
      };

    case CURRENCY_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case CURRENCY_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    default:
      return state;
  }
}

export default currencyReducer;
```

### Étape 2 : Créer le CurrencyContext

```jsx
// ===== contexts/CurrencyContext.js =====
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import currencyReducer, {
  initialCurrencyState,
  CURRENCY_ACTIONS,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  CURRENCY_NAMES,
} from "../reducers/currency-reducer";

const CurrencyContext = createContext(null);

/**
 * Provider pour les préférences de devise
 */
export function CurrencyProvider({ children }) {
  // Initialiser avec la devise sauvegardée dans localStorage
  const getInitialState = () => {
    try {
      const savedCurrency = localStorage.getItem("preferredCurrency");
      if (savedCurrency && EXCHANGE_RATES[savedCurrency]) {
        return {
          ...initialCurrencyState,
          currentCurrency: savedCurrency,
        };
      }
    } catch (error) {
      console.error("Erreur lecture localStorage:", error);
    }
    return initialCurrencyState;
  };

  const [state, dispatch] = useReducer(currencyReducer, null, getInitialState);

  /**
   * Change la devise courante et persiste dans localStorage
   */
  const setCurrency = useCallback((currency) => {
    if (!EXCHANGE_RATES[currency]) {
      console.error(`❌ Devise non supportée: ${currency}`);
      return;
    }

    dispatch({ type: CURRENCY_ACTIONS.SET_CURRENCY, payload: currency });

    // Persister dans localStorage
    try {
      localStorage.setItem("preferredCurrency", currency);
      console.log(
        `💱 Devise changée: ${CURRENCY_NAMES[currency]} (${currency})`
      );
    } catch (error) {
      console.error("Erreur sauvegarde localStorage:", error);
    }
  }, []);

  /**
   * Convertit un prix USD vers la devise courante
   * @param {number} priceUSD - Prix en dollars US
   * @returns {number} Prix converti
   */
  const convertPrice = useCallback(
    (priceUSD) => {
      const rate = state.rates[state.currentCurrency];
      return priceUSD * rate;
    },
    [state.currentCurrency, state.rates]
  );

  /**
   * Formate un prix avec le symbole de devise approprié
   * @param {number} price - Prix à formater (déjà converti ou en USD)
   * @param {Object} options - Options de formatage
   * @returns {string} Prix formaté
   */
  const formatPrice = useCallback(
    (price, options = {}) => {
      const {
        convert = true,
        decimals = 2,
        locale = "fr-FR",
        showCode = false,
      } = options;

      const finalPrice = convert ? convertPrice(price) : price;
      const symbol = CURRENCY_SYMBOLS[state.currentCurrency];

      const formattedNumber = finalPrice.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      if (showCode) {
        return `${formattedNumber} ${state.currentCurrency}`;
      }

      // Position du symbole selon la devise
      if (["EUR", "CHF"].includes(state.currentCurrency)) {
        return `${formattedNumber} ${symbol}`;
      }
      return `${symbol}${formattedNumber}`;
    },
    [state.currentCurrency, convertPrice]
  );

  /**
   * Convertit et formate en une seule opération
   */
  const convertAndFormat = useCallback(
    (priceUSD, options = {}) => {
      return formatPrice(priceUSD, { ...options, convert: true });
    },
    [formatPrice]
  );

  /**
   * Retourne toutes les devises disponibles
   */
  const availableCurrencies = useMemo(
    () =>
      Object.keys(EXCHANGE_RATES).map((code) => ({
        code,
        name: CURRENCY_NAMES[code],
        symbol: CURRENCY_SYMBOLS[code],
        rate: EXCHANGE_RATES[code],
      })),
    []
  );

  // Synchroniser avec localStorage si la devise change dans un autre onglet
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "preferredCurrency" && e.newValue) {
        dispatch({ type: CURRENCY_ACTIONS.SET_CURRENCY, payload: e.newValue });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const contextValue = useMemo(
    () => ({
      // État
      currency: state.currentCurrency,
      currentCurrency: state.currentCurrency,
      rates: state.rates,
      isLoading: state.isLoading,

      // Actions
      setCurrency,
      convertPrice,
      formatPrice,
      convertAndFormat,

      // Helpers
      availableCurrencies,
      currencySymbol: CURRENCY_SYMBOLS[state.currentCurrency],
      currencyName: CURRENCY_NAMES[state.currentCurrency],
      exchangeRate: state.rates[state.currentCurrency],
    }),
    [
      state,
      setCurrency,
      convertPrice,
      formatPrice,
      convertAndFormat,
      availableCurrencies,
    ]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Hook personnalisé pour accéder au contexte de devise
 */
export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error(
      "useCurrency doit être utilisé à l'intérieur d'un CurrencyProvider"
    );
  }

  return context;
}

export default CurrencyContext;
```

### Étape 3 : Hook useCurrency autonome (alternative)

```jsx
// ===== hooks/useCurrency.js =====
// Version hook autonome utilisant useLocalStorage
import { useState, useCallback, useMemo, useEffect } from "react";

const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
};

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Hook pour gérer la conversion de devises avec persistance localStorage
 */
function useCurrency() {
  // Récupérer la devise depuis localStorage
  const getStoredCurrency = () => {
    try {
      const stored = localStorage.getItem("currency");
      return stored && EXCHANGE_RATES[stored] ? stored : "USD";
    } catch {
      return "USD";
    }
  };

  const [currency, setCurrencyState] = useState(getStoredCurrency);

  // Setter qui persiste dans localStorage
  const setCurrency = useCallback((newCurrency) => {
    if (!EXCHANGE_RATES[newCurrency]) {
      console.error(`Devise non supportée: ${newCurrency}`);
      return;
    }
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem("currency", newCurrency);
    } catch (error) {
      console.error("Erreur localStorage:", error);
    }
  }, []);

  // Convertir un prix USD vers la devise actuelle
  const convertPrice = useCallback(
    (priceUSD) => {
      const rate = EXCHANGE_RATES[currency];
      return priceUSD * rate;
    },
    [currency]
  );

  // Formater un prix avec le symbole approprié
  const formatPrice = useCallback(
    (price) => {
      const symbol = CURRENCY_SYMBOLS[currency];
      const formatted = price.toFixed(2);

      if (currency === "EUR") {
        return `${formatted} ${symbol}`;
      }
      return `${symbol}${formatted}`;
    },
    [currency]
  );

  // Convertir et formater en une seule opération
  const convertAndFormat = useCallback(
    (priceUSD) => {
      const converted = convertPrice(priceUSD);
      return formatPrice(converted);
    },
    [convertPrice, formatPrice]
  );

  // Synchroniser avec les autres onglets
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "currency" && e.newValue) {
        setCurrencyState(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    currency,
    setCurrency,
    convertPrice,
    formatPrice,
    convertAndFormat,
  };
}

export default useCurrency;
```

### Étape 4 : Composants d'utilisation

```jsx
// ===== components/CurrencySelector.jsx =====
import React from "react";
import { useCurrency } from "../contexts/CurrencyContext";

function CurrencySelector() {
  const { currency, setCurrency, availableCurrencies, currencySymbol } =
    useCurrency();

  return (
    <div className="currency-selector">
      <label htmlFor="currency-select">💱 Devise : {currencySymbol}</label>
      <select
        id="currency-select"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      >
        {availableCurrencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.name} ({c.code})
          </option>
        ))}
      </select>
    </div>
  );
}

export default CurrencySelector;
```

```jsx
// ===== components/TourPrice.jsx =====
import React from "react";
import { useCurrency } from "../contexts/CurrencyContext";

function TourPrice({ priceUSD, tourName }) {
  const { convertAndFormat, currency, exchangeRate } = useCurrency();

  return (
    <div className="tour-price">
      <h3>{tourName}</h3>
      <p className="price-main">{convertAndFormat(priceUSD)}</p>

      {currency !== "USD" && (
        <p className="price-original">
          Prix original : ${priceUSD.toFixed(2)} USD
          <br />
          <small>
            Taux : 1 USD = {exchangeRate.toFixed(4)} {currency}
          </small>
        </p>
      )}
    </div>
  );
}

export default TourPrice;
```

### Étape 5 : Tests unitaires

```javascript
// ===== __tests__/useCurrency.test.js =====
import { renderHook, act } from "@testing-library/react";
import { CurrencyProvider, useCurrency } from "../contexts/CurrencyContext";

const wrapper = ({ children }) => (
  <CurrencyProvider>{children}</CurrencyProvider>
);

describe("useCurrency", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("initialise avec USD par défaut", () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    expect(result.current.currency).toBe("USD");
  });

  test("change la devise correctement", () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    act(() => {
      result.current.setCurrency("EUR");
    });

    expect(result.current.currency).toBe("EUR");
    expect(result.current.currencySymbol).toBe("€");
  });

  test("convertit USD vers EUR correctement", () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    act(() => {
      result.current.setCurrency("EUR");
    });

    const converted = result.current.convertPrice(100);
    expect(converted).toBe(92); // 100 * 0.92
  });

  test("formate le prix avec le bon symbole", () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    act(() => {
      result.current.setCurrency("GBP");
    });

    const formatted = result.current.formatPrice(100, { convert: false });
    expect(formatted).toContain("£");
    expect(formatted).toContain("100");
  });

  test("convertit et formate en une opération", () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    act(() => {
      result.current.setCurrency("EUR");
    });

    const result_str = result.current.convertAndFormat(100);
    expect(result_str).toContain("€");
    expect(result_str).toContain("92");
  });

  test("persiste la devise dans localStorage", () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    act(() => {
      result.current.setCurrency("GBP");
    });

    expect(localStorage.getItem("preferredCurrency")).toBe("GBP");
  });

  test("restaure la devise depuis localStorage", () => {
    localStorage.setItem("preferredCurrency", "EUR");

    const { result } = renderHook(() => useCurrency(), { wrapper });
    expect(result.current.currency).toBe("EUR");
  });
});
```

---

## Exercice 2 : Panier avec Save for Later + LocalStorage

### Objectif

Créer un panier de réservation complet qui :

- Utilise `useReducer` pour la logique d'état
- Persiste automatiquement dans `localStorage`
- Permet de déplacer des items vers "Saved for Later" et inversement
- Supporte les codes promo
- Suit le pattern Container/Presentational

### Étape 1 : Créer le reducer du panier

```javascript
// ===== reducers/cart-reducer.js =====

/**
 * État initial du panier
 */
export const initialCartState = {
  items: [], // Items actifs dans le panier
  savedForLater: [], // Items enregistrés pour plus tard
  promoCode: null,
  discount: 0,
  status: "idle", // 'idle' | 'loading' | 'error'
  error: null,
};

/**
 * Codes promo disponibles (en production, validation côté serveur)
 */
const PROMO_CODES = {
  AVENGERS10: {
    discount: 10,
    type: "percentage",
    description: "10% de réduction",
  },
  STARK50: { discount: 50, type: "fixed", description: "50$ de réduction" },
  WELCOME20: {
    discount: 20,
    type: "percentage",
    description: "20% de réduction nouveaux clients",
  },
};

/**
 * Actions du reducer
 */
export const CART_ACTIONS = {
  ADD_ITEM: "add_item",
  REMOVE_ITEM: "remove_item",
  UPDATE_QUANTITY: "update_quantity",
  TOGGLE_SAVED_FOR_LATER: "toggle_saved_for_later",
  MOVE_TO_CART: "move_to_cart",
  CLEAR_CART: "clear_cart",
  APPLY_PROMO: "apply_promo",
  REMOVE_PROMO: "remove_promo",
  RESTORE_CART: "restore_cart",
  SET_ERROR: "set_error",
};

/**
 * Calcule le total du panier
 */
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Calcule la réduction basée sur le code promo
 */
function calculateDiscount(total, promoCode) {
  if (!promoCode || !PROMO_CODES[promoCode]) return 0;

  const promo = PROMO_CODES[promoCode];
  if (promo.type === "percentage") {
    return (total * promo.discount) / 100;
  }
  return Math.min(promo.discount, total); // Ne pas dépasser le total
}

/**
 * Reducer du panier
 */
function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const {
        tourId,
        tourName,
        price,
        quantity = 1,
        guide,
        imageUrl,
      } = action.payload;

      // Vérifier si l'item existe déjà
      const existingIndex = state.items.findIndex(
        (item) => item.tourId === tourId
      );

      let newItems;
      if (existingIndex !== -1) {
        // Incrémenter la quantité
        newItems = state.items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Ajouter nouvel item
        newItems = [
          ...state.items,
          {
            tourId,
            tourName,
            price,
            quantity,
            guide,
            imageUrl,
            addedAt: new Date().toISOString(),
          },
        ];
      }

      const newTotal = calculateTotal(newItems);
      const newDiscount = calculateDiscount(newTotal, state.promoCode);

      return {
        ...state,
        items: newItems,
        discount: newDiscount,
      };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const newItems = state.items.filter(
        (item) => item.tourId !== action.payload.tourId
      );
      const newTotal = calculateTotal(newItems);
      const newDiscount = calculateDiscount(newTotal, state.promoCode);

      return {
        ...state,
        items: newItems,
        discount: newDiscount,
      };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { tourId, quantity } = action.payload;

      if (quantity <= 0) {
        // Supprimer l'item si quantité <= 0
        return cartReducer(state, {
          type: CART_ACTIONS.REMOVE_ITEM,
          payload: { tourId },
        });
      }

      const newItems = state.items.map((item) =>
        item.tourId === tourId ? { ...item, quantity } : item
      );

      const newTotal = calculateTotal(newItems);
      const newDiscount = calculateDiscount(newTotal, state.promoCode);

      return {
        ...state,
        items: newItems,
        discount: newDiscount,
      };
    }

    case CART_ACTIONS.TOGGLE_SAVED_FOR_LATER: {
      const { tourId } = action.payload;

      // Chercher l'item dans le panier actif
      const itemInCart = state.items.find((item) => item.tourId === tourId);

      if (itemInCart) {
        // Déplacer du panier vers savedForLater
        const newItems = state.items.filter((item) => item.tourId !== tourId);
        const newSavedForLater = [
          ...state.savedForLater,
          { ...itemInCart, savedAt: new Date().toISOString() },
        ];

        const newTotal = calculateTotal(newItems);
        const newDiscount = calculateDiscount(newTotal, state.promoCode);

        console.log(`💾 "${itemInCart.tourName}" enregistré pour plus tard`);

        return {
          ...state,
          items: newItems,
          savedForLater: newSavedForLater,
          discount: newDiscount,
        };
      }

      return state;
    }

    case CART_ACTIONS.MOVE_TO_CART: {
      const { tourId } = action.payload;

      // Chercher l'item dans savedForLater
      const itemInSaved = state.savedForLater.find(
        (item) => item.tourId === tourId
      );

      if (itemInSaved) {
        // Déplacer de savedForLater vers le panier
        const newSavedForLater = state.savedForLater.filter(
          (item) => item.tourId !== tourId
        );
        const { savedAt, ...itemWithoutSavedAt } = itemInSaved;
        const newItems = [
          ...state.items,
          { ...itemWithoutSavedAt, addedAt: new Date().toISOString() },
        ];

        const newTotal = calculateTotal(newItems);
        const newDiscount = calculateDiscount(newTotal, state.promoCode);

        console.log(`🛒 "${itemInSaved.tourName}" remis dans le panier`);

        return {
          ...state,
          items: newItems,
          savedForLater: newSavedForLater,
          discount: newDiscount,
        };
      }

      return state;
    }

    case CART_ACTIONS.CLEAR_CART: {
      return {
        ...initialCartState,
        // Garder les items savedForLater lors du clear
        savedForLater: state.savedForLater,
      };
    }

    case CART_ACTIONS.APPLY_PROMO: {
      const code = action.payload.toUpperCase();

      if (!PROMO_CODES[code]) {
        return {
          ...state,
          error: `Code promo "${code}" invalide`,
        };
      }

      const total = calculateTotal(state.items);
      const discount = calculateDiscount(total, code);

      console.log(
        `✅ Code promo "${code}" appliqué: ${PROMO_CODES[code].description}`
      );

      return {
        ...state,
        promoCode: code,
        discount,
        error: null,
      };
    }

    case CART_ACTIONS.REMOVE_PROMO: {
      return {
        ...state,
        promoCode: null,
        discount: 0,
      };
    }

    case CART_ACTIONS.RESTORE_CART: {
      // Restaurer depuis localStorage
      const { items, promoCode } = action.payload;
      const total = calculateTotal(items);
      const discount = calculateDiscount(total, promoCode);

      return {
        ...state,
        items,
        promoCode,
        discount,
      };
    }

    case CART_ACTIONS.SET_ERROR: {
      return {
        ...state,
        error: action.payload,
      };
    }

    default:
      return state;
  }
}

export default cartReducer;
export { PROMO_CODES };
```

### Étape 2 : Créer le CartContext avec persistance localStorage

```jsx
// ===== contexts/CartContext.js =====
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import cartReducer, {
  initialCartState,
  CART_ACTIONS,
  PROMO_CODES,
} from "../reducers/cart-reducer";

const CartContext = createContext(null);

const STORAGE_KEY = "tourism_cart";

/**
 * Provider du panier avec persistance localStorage
 */
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  /**
   * Restaurer le panier depuis localStorage au montage
   */
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      if (savedCart) {
        const { items, promoCode } = JSON.parse(savedCart);
        if (items && items.length > 0) {
          dispatch({
            type: CART_ACTIONS.RESTORE_CART,
            payload: { items, promoCode },
          });
          console.log("🛒 Panier restauré depuis localStorage");
        }
      }
    } catch (error) {
      console.error("Erreur restauration panier:", error);
    }
  }, []);

  /**
   * Sauvegarder le panier dans localStorage à chaque changement
   */
  useEffect(() => {
    try {
      const dataToSave = {
        items: state.items,
        promoCode: state.promoCode,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Erreur sauvegarde panier:", error);
    }
  }, [state.items, state.promoCode]);

  // Actions helper
  const addItem = useCallback((item) => {
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: item });
  }, []);

  const removeItem = useCallback((tourId) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: { tourId } });
  }, []);

  const updateQuantity = useCallback((tourId, quantity) => {
    dispatch({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { tourId, quantity },
    });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const applyPromoCode = useCallback((code) => {
    dispatch({ type: CART_ACTIONS.APPLY_PROMO, payload: code });
  }, []);

  const removePromoCode = useCallback(() => {
    dispatch({ type: CART_ACTIONS.REMOVE_PROMO });
  }, []);

  // Valeurs calculées
  const subtotal = useMemo(() => {
    return state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [state.items]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - state.discount);
  }, [subtotal, state.discount]);

  const itemCount = useMemo(() => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  }, [state.items]);

  const promoDetails = useMemo(() => {
    if (!state.promoCode || !PROMO_CODES[state.promoCode]) return null;
    return {
      code: state.promoCode,
      ...PROMO_CODES[state.promoCode],
    };
  }, [state.promoCode]);

  const contextValue = useMemo(
    () => ({
      // État
      items: state.items,
      promoCode: state.promoCode,
      discount: state.discount,
      error: state.error,

      // Valeurs calculées
      subtotal,
      total,
      itemCount,
      promoDetails,
      isEmpty: state.items.length === 0,

      // Actions
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      applyPromoCode,
      removePromoCode,
    }),
    [
      state,
      subtotal,
      total,
      itemCount,
      promoDetails,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      applyPromoCode,
      removePromoCode,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
}

/**
 * Hook personnalisé pour accéder au panier
 */
export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart doit être utilisé à l'intérieur d'un CartProvider"
    );
  }

  return context;
}

export default CartContext;
```

### Étape 3 : Composants Presentational (UI pure)

```jsx
// ===== components/presentational/CartItemDisplay.jsx =====
import React from "react";

/**
 * Composant Presentational - Affiche un item du panier
 * Pas de logique, uniquement du rendu
 */
function CartItemDisplay({ item, onUpdateQuantity, onRemove, formatPrice }) {
  const itemTotal = item.price * item.quantity;

  return (
    <div className="cart-item">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.tourName}
          className="cart-item-image"
        />
      )}

      <div className="cart-item-info">
        <h4>{item.tourName}</h4>
        {item.guide && <p className="guide">Guide : {item.guide}</p>}
        <p className="unit-price">{formatPrice(item.price)} / personne</p>
      </div>

      <div className="cart-item-controls">
        <div className="quantity-selector">
          <button
            onClick={() => onUpdateQuantity(item.tourId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            aria-label="Diminuer la quantité"
          >
            -
          </button>
          <span className="quantity">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.tourId, item.quantity + 1)}
            aria-label="Augmenter la quantité"
          >
            +
          </button>
        </div>

        <p className="item-total">{formatPrice(itemTotal)}</p>

        <button
          className="btn-remove"
          onClick={() => onRemove(item.tourId)}
          aria-label={`Retirer ${item.tourName} du panier`}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default CartItemDisplay;
```

```jsx
// ===== components/presentational/PromoCodeInput.jsx =====
import React, { useState } from "react";

/**
 * Composant Presentational - Saisie de code promo
 */
function PromoCodeInput({
  currentCode,
  promoDetails,
  error,
  onApply,
  onRemove,
}) {
  const [inputCode, setInputCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputCode.trim()) {
      onApply(inputCode.trim());
      setInputCode("");
    }
  };

  if (currentCode && promoDetails) {
    return (
      <div className="promo-applied">
        <span className="promo-badge">
          ✅ {currentCode} : {promoDetails.description}
        </span>
        <button onClick={onRemove} className="btn-remove-promo">
          Retirer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="promo-form">
      <input
        type="text"
        value={inputCode}
        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
        placeholder="Code promo"
        className="promo-input"
      />
      <button type="submit" className="btn-apply-promo">
        Appliquer
      </button>
      {error && <p className="promo-error">{error}</p>}
    </form>
  );
}

export default PromoCodeInput;
```

```jsx
// ===== components/presentational/CartSummary.jsx =====
import React from "react";

/**
 * Composant Presentational - Résumé du panier
 */
function CartSummary({
  subtotal,
  discount,
  total,
  formatPrice,
  onCheckout,
  onClear,
  isDisabled,
}) {
  return (
    <div className="cart-summary">
      <div className="summary-line">
        <span>Sous-total :</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {discount > 0 && (
        <div className="summary-line discount">
          <span>Réduction :</span>
          <span>-{formatPrice(discount)}</span>
        </div>
      )}

      <div className="summary-line total">
        <span>Total :</span>
        <span>{formatPrice(total)}</span>
      </div>

      <div className="summary-actions">
        <button className="btn-clear" onClick={onClear} disabled={isDisabled}>
          Vider le panier
        </button>
        <button
          className="btn-checkout"
          onClick={onCheckout}
          disabled={isDisabled}
        >
          Procéder au paiement
        </button>
      </div>
    </div>
  );
}

export default CartSummary;
```

### Étape 4 : Composant Container (logique)

```jsx
// ===== components/containers/CartContainer.jsx =====
import React from "react";
import { useCart } from "../../contexts/CartContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import CartItemDisplay from "../presentational/CartItemDisplay";
import PromoCodeInput from "../presentational/PromoCodeInput";
import CartSummary from "../presentational/CartSummary";

/**
 * Composant Container - Gère la logique et connecte au Context
 */
function CartContainer() {
  const {
    items,
    promoCode,
    promoDetails,
    discount,
    error,
    subtotal,
    total,
    isEmpty,
    updateQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
  } = useCart();

  const { convertAndFormat } = useCurrency();

  const handleCheckout = () => {
    console.log("Procéder au paiement avec:", {
      items,
      promoCode,
      discount,
      total,
    });
    // Navigation vers la page de paiement
    // navigate('/checkout');
  };

  if (isEmpty) {
    return (
      <div className="cart-empty">
        <h2>🛒 Votre Panier</h2>
        <p>Votre panier est vide. Découvrez nos visites exceptionnelles !</p>
        <p className="hint">
          💡 Essayez les codes promo : AVENGERS10, STARK50, WELCOME20
        </p>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>
        🛒 Votre Panier ({items.length} visite{items.length > 1 ? "s" : ""})
      </h2>

      <div className="cart-items">
        {items.map((item) => (
          <CartItemDisplay
            key={item.tourId}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            formatPrice={convertAndFormat}
          />
        ))}
      </div>

      <PromoCodeInput
        currentCode={promoCode}
        promoDetails={promoDetails}
        error={error}
        onApply={applyPromoCode}
        onRemove={removePromoCode}
      />

      <CartSummary
        subtotal={subtotal}
        discount={discount}
        total={total}
        formatPrice={convertAndFormat}
        onCheckout={handleCheckout}
        onClear={clearCart}
        isDisabled={isEmpty}
      />
    </div>
  );
}

export default CartContainer;
```

### Étape 5 : Tests

```javascript
// ===== __tests__/cart-reducer.test.js =====
import cartReducer, {
  initialCartState,
  CART_ACTIONS,
} from "../reducers/cart-reducer";

describe("Cart Reducer", () => {
  const mockTour = {
    tourId: "tour-wakanda-001",
    tourName: "Wakanda Heritage Tour",
    price: 299,
    quantity: 1,
    guide: "T'Challa",
  };

  test("ajoute un item au panier", () => {
    const state = cartReducer(initialCartState, {
      type: CART_ACTIONS.ADD_ITEM,
      payload: mockTour,
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].tourId).toBe("tour-wakanda-001");
    expect(state.items[0].quantity).toBe(1);
  });

  test("incrémente la quantité si item existe déjà", () => {
    const stateWithItem = {
      ...initialCartState,
      items: [{ ...mockTour }],
    };

    const state = cartReducer(stateWithItem, {
      type: CART_ACTIONS.ADD_ITEM,
      payload: mockTour,
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  test("met à jour la quantité correctement", () => {
    const stateWithItem = {
      ...initialCartState,
      items: [{ ...mockTour, quantity: 2 }],
    };

    const state = cartReducer(stateWithItem, {
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { tourId: "tour-wakanda-001", quantity: 5 },
    });

    expect(state.items[0].quantity).toBe(5);
  });

  test("supprime l'item si quantité <= 0", () => {
    const stateWithItem = {
      ...initialCartState,
      items: [{ ...mockTour }],
    };

    const state = cartReducer(stateWithItem, {
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { tourId: "tour-wakanda-001", quantity: 0 },
    });

    expect(state.items).toHaveLength(0);
  });

  test("applique un code promo valide", () => {
    const stateWithItem = {
      ...initialCartState,
      items: [{ ...mockTour, quantity: 1, price: 100 }],
    };

    const state = cartReducer(stateWithItem, {
      type: CART_ACTIONS.APPLY_PROMO,
      payload: "AVENGERS10",
    });

    expect(state.promoCode).toBe("AVENGERS10");
    expect(state.discount).toBe(10); // 10% de 100
  });

  test("rejette un code promo invalide", () => {
    const state = cartReducer(initialCartState, {
      type: CART_ACTIONS.APPLY_PROMO,
      payload: "INVALID",
    });

    expect(state.promoCode).toBeNull();
    expect(state.error).toContain("invalide");
  });

  test("vide le panier complètement", () => {
    const stateWithItems = {
      ...initialCartState,
      items: [mockTour],
      promoCode: "AVENGERS10",
      discount: 10,
    };

    const state = cartReducer(stateWithItems, {
      type: CART_ACTIONS.CLEAR_CART,
    });

    expect(state.items).toHaveLength(0);
    expect(state.promoCode).toBeNull();
    expect(state.discount).toBe(0);
  });

  test("toggle saved for later déplace un item du panier vers savedForLater", () => {
    const stateWithItems = {
      ...initialCartState,
      items: [mockTour],
    };

    const state = cartReducer(stateWithItems, {
      type: CART_ACTIONS.TOGGLE_SAVED_FOR_LATER,
      payload: { tourId: "tour-wakanda-001" },
    });

    expect(state.items).toHaveLength(0);
    expect(state.savedForLater).toHaveLength(1);
    expect(state.savedForLater[0].tourId).toBe("tour-wakanda-001");
    expect(state.savedForLater[0].savedAt).toBeDefined();
  });

  test("move to cart déplace un item de savedForLater vers le panier", () => {
    const stateWithSaved = {
      ...initialCartState,
      savedForLater: [{ ...mockTour, savedAt: new Date().toISOString() }],
    };

    const state = cartReducer(stateWithSaved, {
      type: CART_ACTIONS.MOVE_TO_CART,
      payload: { tourId: "tour-wakanda-001" },
    });

    expect(state.savedForLater).toHaveLength(0);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].tourId).toBe("tour-wakanda-001");
  });
});
```

---

## Exercice 3 : Tour Search avec useReducer et Context

### Objectif

Implémenter un système de recherche global pour filtrer les visites par :

- Terme de recherche (query)
- Catégorie
- En utilisant `useReducer` pour la logique d'état
- Context API pour partager l'état de recherche globalement

### Étape 1 : Créer le reducer de recherche

```javascript
// ===== reducers/search-reducer.js =====

/**
 * Catégories de visites disponibles
 */
export const TOUR_CATEGORIES = [
  { id: "all", label: "Toutes les catégories", icon: "🌍" },
  { id: "cultural", label: "Culturel", icon: "🏛️" },
  { id: "adventure", label: "Aventure", icon: "🏔️" },
  { id: "technology", label: "Technologie", icon: "🤖" },
  { id: "cosmic", label: "Cosmique", icon: "🌌" },
  { id: "historical", label: "Historique", icon: "📜" },
];

/**
 * État initial de la recherche
 */
export const initialSearchState = {
  query: "",
  category: "all",
  priceRange: { min: 0, max: 10000 },
  sortBy: "relevance", // 'relevance' | 'price-asc' | 'price-desc' | 'name'
  isSearching: false,
};

/**
 * Actions de recherche
 */
export const SEARCH_ACTIONS = {
  SET_QUERY: "set_query",
  SET_CATEGORY: "set_category",
  SET_PRICE_RANGE: "set_price_range",
  SET_SORT_BY: "set_sort_by",
  RESET_FILTERS: "reset_filters",
  SET_SEARCHING: "set_searching",
};

/**
 * Reducer de recherche
 */
function searchReducer(state, action) {
  switch (action.type) {
    case SEARCH_ACTIONS.SET_QUERY:
      return {
        ...state,
        query: action.payload,
      };

    case SEARCH_ACTIONS.SET_CATEGORY:
      return {
        ...state,
        category: action.payload,
      };

    case SEARCH_ACTIONS.SET_PRICE_RANGE:
      return {
        ...state,
        priceRange: {
          ...state.priceRange,
          ...action.payload,
        },
      };

    case SEARCH_ACTIONS.SET_SORT_BY:
      return {
        ...state,
        sortBy: action.payload,
      };

    case SEARCH_ACTIONS.RESET_FILTERS:
      return {
        ...initialSearchState,
      };

    case SEARCH_ACTIONS.SET_SEARCHING:
      return {
        ...state,
        isSearching: action.payload,
      };

    default:
      return state;
  }
}

export default searchReducer;
```

### Étape 2 : Créer le TourSearchContext

```jsx
// ===== contexts/TourSearchContext.js =====
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import searchReducer, {
  initialSearchState,
  SEARCH_ACTIONS,
  TOUR_CATEGORIES,
} from "../reducers/search-reducer";

const TourSearchContext = createContext(null);

/**
 * Provider pour la recherche de visites
 */
export function TourSearchProvider({ children }) {
  const [searchState, dispatch] = useReducer(searchReducer, initialSearchState);

  // Actions helper
  const setQuery = useCallback((query) => {
    dispatch({ type: SEARCH_ACTIONS.SET_QUERY, payload: query });
  }, []);

  const setCategory = useCallback((category) => {
    dispatch({ type: SEARCH_ACTIONS.SET_CATEGORY, payload: category });
  }, []);

  const setPriceRange = useCallback((range) => {
    dispatch({ type: SEARCH_ACTIONS.SET_PRICE_RANGE, payload: range });
  }, []);

  const setSortBy = useCallback((sortBy) => {
    dispatch({ type: SEARCH_ACTIONS.SET_SORT_BY, payload: sortBy });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: SEARCH_ACTIONS.RESET_FILTERS });
  }, []);

  /**
   * Fonction de filtrage des visites
   */
  const filterTours = useCallback(
    (tours) => {
      let filtered = [...tours];

      // Filtrer par query (recherche texte)
      if (searchState.query.trim()) {
        const queryLower = searchState.query.toLowerCase();
        filtered = filtered.filter(
          (tour) =>
            tour.name.toLowerCase().includes(queryLower) ||
            tour.description.toLowerCase().includes(queryLower) ||
            tour.guide.toLowerCase().includes(queryLower)
        );
      }

      // Filtrer par catégorie
      if (searchState.category !== "all") {
        filtered = filtered.filter(
          (tour) => tour.category === searchState.category
        );
      }

      // Filtrer par prix
      filtered = filtered.filter(
        (tour) =>
          tour.price >= searchState.priceRange.min &&
          tour.price <= searchState.priceRange.max
      );

      // Trier les résultats
      switch (searchState.sortBy) {
        case "price-asc":
          filtered.sort((a, b) => a.price - b.price);
          break;
        case "price-desc":
          filtered.sort((a, b) => b.price - a.price);
          break;
        case "name":
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        default:
          // relevance - garder l'ordre original (ou par score de pertinence)
          break;
      }

      return filtered;
    },
    [searchState]
  );

  const contextValue = useMemo(
    () => ({
      searchState,
      dispatch,
      setQuery,
      setCategory,
      setPriceRange,
      setSortBy,
      resetFilters,
      filterTours,
      categories: TOUR_CATEGORIES,
      hasActiveFilters:
        searchState.query !== "" ||
        searchState.category !== "all" ||
        searchState.priceRange.min > 0 ||
        searchState.priceRange.max < 10000,
    }),
    [
      searchState,
      setQuery,
      setCategory,
      setPriceRange,
      setSortBy,
      resetFilters,
      filterTours,
    ]
  );

  return (
    <TourSearchContext.Provider value={contextValue}>
      {children}
    </TourSearchContext.Provider>
  );
}

/**
 * Hook personnalisé pour utiliser le contexte de recherche
 */
export function useTourSearch() {
  const context = useContext(TourSearchContext);

  if (!context) {
    throw new Error(
      "useTourSearch doit être utilisé dans un TourSearchProvider"
    );
  }

  return context;
}
```

### Étape 3 : Composant SearchBar

```jsx
// ===== components/SearchBar.jsx =====
import React from "react";
import { useTourSearch } from "../contexts/TourSearchContext";
import useDebounce from "../hooks/useDebounce";

function SearchBar() {
  const {
    searchState,
    setQuery,
    setCategory,
    setSortBy,
    resetFilters,
    categories,
    hasActiveFilters,
  } = useTourSearch();

  // Utiliser le debounce pour éviter trop de re-renders
  const [localQuery, setLocalQuery] = React.useState(searchState.query);
  const debouncedQuery = useDebounce(localQuery, 300);

  // Synchroniser le query debouncé avec le context
  React.useEffect(() => {
    setQuery(debouncedQuery);
  }, [debouncedQuery, setQuery]);

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Rechercher une visite (Wakanda, Asgard, Stark...)"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="search-input"
        />
        {localQuery && (
          <button
            className="clear-input"
            onClick={() => {
              setLocalQuery("");
              setQuery("");
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div className="search-filters">
        <select
          value={searchState.category}
          onChange={(e) => setCategory(e.target.value)}
          className="category-select"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>

        <select
          value={searchState.sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="relevance">Pertinence</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="name">Nom A-Z</option>
        </select>

        {hasActiveFilters && (
          <button className="reset-filters" onClick={resetFilters}>
            🔄 Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
```

### Étape 4 : TourList avec filtrage

```jsx
// ===== components/TourList.jsx =====
import React, { useState, useEffect } from "react";
import { useTourSearch } from "../contexts/TourSearchContext";
import TourCard from "./TourCard";

// Données de visites Marvel (simulées)
const ALL_TOURS = [
  {
    id: "tour-wakanda-001",
    name: "Wakanda Heritage Tour",
    description:
      "Explorez le royaume le plus technologiquement avancé du monde.",
    guide: "T'Challa",
    price: 299,
    category: "technology",
    imageUrl: "/images/wakanda.jpg",
  },
  {
    id: "tour-asgard-002",
    name: "Asgard Cosmic Cruise",
    description: "Voyagez à travers les neuf royaumes avec Thor.",
    guide: "Thor Odinson",
    price: 449,
    category: "cosmic",
    imageUrl: "/images/asgard.jpg",
  },
  {
    id: "tour-stark-003",
    name: "Avengers Tower Experience",
    description: "Visite guidée exclusive de la tour des Avengers.",
    guide: "Tony Stark",
    price: 379,
    category: "technology",
    imageUrl: "/images/avengers-tower.jpg",
  },
  {
    id: "tour-shield-004",
    name: "S.H.I.E.L.D. Headquarters Tour",
    description: "Découvrez les coulisses de l'agence secrète.",
    guide: "Nick Fury",
    price: 329,
    category: "historical",
    imageUrl: "/images/shield.jpg",
  },
  {
    id: "tour-sanctum-005",
    name: "Sanctum Sanctorum Mystical Tour",
    description: "Explorez les arts mystiques avec le Sorcier Suprême.",
    guide: "Doctor Strange",
    price: 499,
    category: "cultural",
    imageUrl: "/images/sanctum.jpg",
  },
  {
    id: "tour-xmansion-006",
    name: "Xavier's School Tour",
    description: "Découvrez l'école pour jeunes surdoués.",
    guide: "Professor X",
    price: 259,
    category: "cultural",
    imageUrl: "/images/xmansion.jpg",
  },
  {
    id: "tour-knowhere-007",
    name: "Knowhere Space Station",
    description: "Aventure intergalactique dans la tête du Céleste.",
    guide: "Star-Lord",
    price: 599,
    category: "cosmic",
    imageUrl: "/images/knowhere.jpg",
  },
  {
    id: "tour-savage-008",
    name: "Savage Land Expedition",
    description: "Safari préhistorique dans la Terre Sauvage.",
    guide: "Ka-Zar",
    price: 349,
    category: "adventure",
    imageUrl: "/images/savage-land.jpg",
  },
];

function TourList() {
  const { filterTours, searchState, hasActiveFilters } = useTourSearch();
  const [tours, setTours] = useState([]);

  // Simuler le chargement des visites depuis une API
  useEffect(() => {
    // En production, ceci serait un appel API
    setTours(ALL_TOURS);
  }, []);

  // Appliquer les filtres
  const filteredTours = filterTours(tours);

  return (
    <div className="tour-list">
      <div className="tour-list-header">
        <h2>🌍 Visites Disponibles</h2>
        <p className="results-count">
          {filteredTours.length} visite{filteredTours.length !== 1 ? "s" : ""}{" "}
          trouvée{filteredTours.length !== 1 ? "s" : ""}
          {hasActiveFilters && " (filtres actifs)"}
        </p>
      </div>

      {filteredTours.length === 0 ? (
        <div className="no-results">
          <p>
            🔍 Aucune visite ne correspond à votre recherche "
            {searchState.query}"
          </p>
          <p>Essayez avec d'autres termes ou réinitialisez les filtres.</p>
        </div>
      ) : (
        <div className="tour-grid">
          {filteredTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  );
}

export default TourList;
```

### Étape 5 : Intégration dans App

```jsx
// ===== App.jsx =====
import React from "react";
import { TourSearchProvider } from "./contexts/TourSearchContext";
import { CartProvider } from "./contexts/CartContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import SearchBar from "./components/SearchBar";
import TourList from "./components/TourList";
import ShoppingCart from "./components/ShoppingCart";

function App() {
  return (
    <CurrencyProvider>
      <CartProvider>
        <TourSearchProvider>
          <div className="app">
            <header className="app-header">
              <h1>⚡ Stark Industries Tourism</h1>
            </header>

            <main className="app-main">
              <SearchBar />

              <div className="content-grid">
                <div className="tours-section">
                  <TourList />
                </div>

                <aside className="cart-section">
                  <ShoppingCart />
                </aside>
              </div>
            </main>
          </div>
        </TourSearchProvider>
      </CartProvider>
    </CurrencyProvider>
  );
}

export default App;
```

### Étape 6 : Tests du reducer de recherche

```javascript
// ===== __tests__/search-reducer.test.js =====
import searchReducer, {
  initialSearchState,
  SEARCH_ACTIONS,
} from "../reducers/search-reducer";

describe("Search Reducer", () => {
  test("initialise avec l'état par défaut", () => {
    const state = searchReducer(undefined, { type: "UNKNOWN" });
    expect(state).toEqual(initialSearchState);
  });

  test("SET_QUERY met à jour le terme de recherche", () => {
    const state = searchReducer(initialSearchState, {
      type: SEARCH_ACTIONS.SET_QUERY,
      payload: "Wakanda",
    });

    expect(state.query).toBe("Wakanda");
  });

  test("SET_CATEGORY met à jour la catégorie", () => {
    const state = searchReducer(initialSearchState, {
      type: SEARCH_ACTIONS.SET_CATEGORY,
      payload: "technology",
    });

    expect(state.category).toBe("technology");
  });

  test("SET_PRICE_RANGE met à jour la plage de prix", () => {
    const state = searchReducer(initialSearchState, {
      type: SEARCH_ACTIONS.SET_PRICE_RANGE,
      payload: { min: 100, max: 500 },
    });

    expect(state.priceRange.min).toBe(100);
    expect(state.priceRange.max).toBe(500);
  });

  test("RESET_FILTERS réinitialise tous les filtres", () => {
    const modifiedState = {
      ...initialSearchState,
      query: "test",
      category: "cosmic",
      sortBy: "price-asc",
    };

    const state = searchReducer(modifiedState, {
      type: SEARCH_ACTIONS.RESET_FILTERS,
    });

    expect(state).toEqual(initialSearchState);
  });
});
```

### Différence avec TourFilter

| Aspect              | TourFilter (Exercice leçon) | TourSearchContext (cet exercice)                  |
| ------------------- | --------------------------- | ------------------------------------------------- |
| **Scope**           | Local au composant          | Global via Context                                |
| **State**           | useState local              | useReducer + Context                              |
| **Réutilisabilité** | Un seul composant           | Tous les composants de l'arbre                    |
| **Actions**         | Fonctions directes          | Dispatch d'actions typées                         |
| **Testabilité**     | Test du composant entier    | Test du reducer isolément                         |
| **Cas d'usage**     | UI de filtre autonome       | Recherche accessible depuis Header, Sidebar, etc. |

---

## Exercice 4 : useNotifications Hook

### Objectif

Créer un système de notifications toast avec :

- Différents types (success, error, info, warning)
- Auto-dismiss configurable (5 secondes par défaut)
- Empilage des notifications
- Animations

### Étape 1 : Créer le reducer des notifications

```javascript
// ===== reducers/notification-reducer.js =====

/**
 * Types de notifications
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
};

/**
 * État initial
 */
export const initialNotificationState = {
  notifications: [],
};

/**
 * Actions
 */
export const NOTIFICATION_ACTIONS = {
  ADD: "add_notification",
  REMOVE: "remove_notification",
  CLEAR_ALL: "clear_all_notifications",
};

/**
 * Génère un ID unique
 */
function generateId() {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Reducer des notifications
 */
function notificationReducer(state, action) {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.ADD: {
      const notification = {
        id: generateId(),
        type: action.payload.type || NOTIFICATION_TYPES.INFO,
        message: action.payload.message,
        title: action.payload.title,
        duration: action.payload.duration ?? 5000, // 5s par défaut
        createdAt: Date.now(),
      };

      return {
        ...state,
        notifications: [...state.notifications, notification],
      };
    }

    case NOTIFICATION_ACTIONS.REMOVE: {
      return {
        ...state,
        notifications: state.notifications.filter(
          (notif) => notif.id !== action.payload.id
        ),
      };
    }

    case NOTIFICATION_ACTIONS.CLEAR_ALL: {
      return {
        ...state,
        notifications: [],
      };
    }

    default:
      return state;
  }
}

export default notificationReducer;
```

### Étape 2 : Créer le NotificationContext

```jsx
// ===== contexts/NotificationContext.js =====
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import notificationReducer, {
  initialNotificationState,
  NOTIFICATION_ACTIONS,
  NOTIFICATION_TYPES,
} from "../reducers/notification-reducer";

const NotificationContext = createContext(null);

/**
 * Provider des notifications
 */
export function NotificationProvider({ children, maxNotifications = 5 }) {
  const [state, dispatch] = useReducer(
    notificationReducer,
    initialNotificationState
  );
  const timersRef = useRef(new Map());

  /**
   * Nettoyer les timers au démontage
   */
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  /**
   * Supprimer une notification
   */
  const removeNotification = useCallback((id) => {
    // Annuler le timer si existant
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    dispatch({ type: NOTIFICATION_ACTIONS.REMOVE, payload: { id } });
  }, []);

  /**
   * Ajouter une notification
   */
  const addNotification = useCallback((options) => {
    const { message, type, title, duration = 5000 } = options;

    // Créer la notification
    dispatch({
      type: NOTIFICATION_ACTIONS.ADD,
      payload: { message, type, title, duration },
    });

    // Note: Le timer sera géré par useEffect ci-dessous
  }, []);

  /**
   * Gérer les timers d'auto-dismiss pour chaque notification
   */
  useEffect(() => {
    state.notifications.forEach((notification) => {
      // Si pas de timer existant et duration > 0
      if (
        !timersRef.current.has(notification.id) &&
        notification.duration > 0
      ) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);

        timersRef.current.set(notification.id, timer);
      }
    });

    // Limiter le nombre de notifications affichées
    if (state.notifications.length > maxNotifications) {
      const oldest = state.notifications[0];
      removeNotification(oldest.id);
    }
  }, [state.notifications, maxNotifications, removeNotification]);

  /**
   * Helpers pour les différents types
   */
  const showSuccess = useCallback(
    (message, options = {}) => {
      addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.SUCCESS,
        title: options.title || "Succès",
      });
    },
    [addNotification]
  );

  const showError = useCallback(
    (message, options = {}) => {
      addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.ERROR,
        title: options.title || "Erreur",
        duration: options.duration ?? 8000, // Plus long pour les erreurs
      });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (message, options = {}) => {
      addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.INFO,
        title: options.title || "Information",
      });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (message, options = {}) => {
      addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.WARNING,
        title: options.title || "Attention",
        duration: options.duration ?? 6000,
      });
    },
    [addNotification]
  );

  const clearAll = useCallback(() => {
    dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ALL });
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const contextValue = useMemo(
    () => ({
      notifications: state.notifications,
      addNotification,
      removeNotification,
      showSuccess,
      showError,
      showInfo,
      showWarning,
      clearAll,
    }),
    [
      state.notifications,
      addNotification,
      removeNotification,
      showSuccess,
      showError,
      showInfo,
      showWarning,
      clearAll,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook personnalisé pour les notifications
 */
export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications doit être utilisé à l'intérieur d'un NotificationProvider"
    );
  }

  return context;
}

export default NotificationContext;
```

### Étape 3 : Composant d'affichage des notifications

```jsx
// ===== components/NotificationContainer.jsx =====
import React from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { NOTIFICATION_TYPES } from "../reducers/notification-reducer";

/**
 * Icônes par type de notification
 */
const ICONS = {
  [NOTIFICATION_TYPES.SUCCESS]: "✅",
  [NOTIFICATION_TYPES.ERROR]: "❌",
  [NOTIFICATION_TYPES.INFO]: "ℹ️",
  [NOTIFICATION_TYPES.WARNING]: "⚠️",
};

/**
 * Styles par type de notification
 */
const STYLES = {
  [NOTIFICATION_TYPES.SUCCESS]: {
    background: "#d4edda",
    border: "1px solid #c3e6cb",
    color: "#155724",
  },
  [NOTIFICATION_TYPES.ERROR]: {
    background: "#f8d7da",
    border: "1px solid #f5c6cb",
    color: "#721c24",
  },
  [NOTIFICATION_TYPES.INFO]: {
    background: "#d1ecf1",
    border: "1px solid #bee5eb",
    color: "#0c5460",
  },
  [NOTIFICATION_TYPES.WARNING]: {
    background: "#fff3cd",
    border: "1px solid #ffeeba",
    color: "#856404",
  },
};

/**
 * Composant individuel de notification
 */
function NotificationItem({ notification, onClose }) {
  const style = STYLES[notification.type] || STYLES[NOTIFICATION_TYPES.INFO];
  const icon = ICONS[notification.type] || ICONS[NOTIFICATION_TYPES.INFO];

  return (
    <div
      className={`notification notification-${notification.type}`}
      style={{
        ...style,
        padding: "12px 16px",
        borderRadius: "8px",
        marginBottom: "10px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        animation: "slideIn 0.3s ease-out",
      }}
      role="alert"
      aria-live={
        notification.type === NOTIFICATION_TYPES.ERROR ? "assertive" : "polite"
      }
    >
      <span className="notification-icon" style={{ fontSize: "20px" }}>
        {icon}
      </span>

      <div className="notification-content" style={{ flex: 1 }}>
        {notification.title && (
          <strong
            className="notification-title"
            style={{ display: "block", marginBottom: "4px" }}
          >
            {notification.title}
          </strong>
        )}
        <span className="notification-message">{notification.message}</span>
      </div>

      <button
        onClick={() => onClose(notification.id)}
        className="notification-close"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          opacity: 0.6,
        }}
        aria-label="Fermer la notification"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Container des notifications (à placer en haut du DOM)
 */
function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="notification-container"
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        maxWidth: "400px",
        width: "100%",
      }}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}

export default NotificationContainer;
```

### Étape 4 : Exemple d'utilisation

```jsx
// ===== components/BookingActions.jsx =====
import React from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { useCart } from "../contexts/CartContext";

function BookingActions({ tour }) {
  const { showSuccess, showError, showInfo } = useNotifications();
  const { addItem } = useCart();

  const handleAddToCart = () => {
    try {
      addItem({
        tourId: tour.id,
        tourName: tour.name,
        price: tour.price,
        quantity: 1,
        guide: tour.guide,
      });

      showSuccess(`"${tour.name}" a été ajouté à votre panier !`, {
        title: "Visite ajoutée",
      });
    } catch (error) {
      showError(`Impossible d'ajouter la visite : ${error.message}`);
    }
  };

  const handleBookNow = async () => {
    showInfo("Redirection vers le paiement...", { duration: 3000 });

    // Simuler une réservation
    try {
      // await createBooking(...)
      showSuccess(
        "Réservation confirmée ! Vous recevrez un email de confirmation."
      );
    } catch (error) {
      showError(`Échec de la réservation : ${error.message}`);
    }
  };

  return (
    <div className="booking-actions">
      <button onClick={handleAddToCart} className="btn-add-cart">
        Ajouter au panier
      </button>
      <button onClick={handleBookNow} className="btn-book-now">
        Réserver maintenant
      </button>
    </div>
  );
}

export default BookingActions;
```

### Étape 5 : Configuration de l'application

```jsx
// ===== App.jsx =====
import React from "react";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { CartProvider } from "./contexts/CartContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationContainer from "./components/NotificationContainer";
import CartContainer from "./components/containers/CartContainer";
import TourList from "./components/TourList";

function App() {
  return (
    <NotificationProvider maxNotifications={5}>
      <CurrencyProvider>
        <CartProvider>
          <div className="app">
            {/* Container de notifications (toujours visible) */}
            <NotificationContainer />

            <header>
              <h1>🌍 Stark Industries Tourism</h1>
            </header>

            <main>
              <div className="content-grid">
                <section className="tours-section">
                  <TourList />
                </section>

                <aside className="cart-section">
                  <CartContainer />
                </aside>
              </div>
            </main>
          </div>
        </CartProvider>
      </CurrencyProvider>
    </NotificationProvider>
  );
}

export default App;
```

### Étape 6 : Tests

```javascript
// ===== __tests__/useNotifications.test.js =====
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  NotificationProvider,
  useNotifications,
} from "../contexts/NotificationContext";

const wrapper = ({ children }) => (
  <NotificationProvider maxNotifications={3}>{children}</NotificationProvider>
);

describe("useNotifications", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("ajoute une notification success", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showSuccess("Opération réussie !");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("success");
    expect(result.current.notifications[0].message).toBe("Opération réussie !");
  });

  test("ajoute une notification error", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showError("Une erreur est survenue");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("error");
  });

  test("supprime automatiquement après le délai (5s)", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showInfo("Test auto-dismiss", { duration: 5000 });
    });

    expect(result.current.notifications).toHaveLength(1);

    // Avancer le temps de 5 secondes
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });
  });

  test("supprime manuellement une notification", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showSuccess("Test");
    });

    const notifId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notifId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  test("limite le nombre de notifications", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showInfo("Notif 1");
      result.current.showInfo("Notif 2");
      result.current.showInfo("Notif 3");
      result.current.showInfo("Notif 4"); // Dépasse la limite de 3
    });

    // La plus ancienne devrait être supprimée
    expect(result.current.notifications.length).toBeLessThanOrEqual(3);
  });

  test("clearAll supprime toutes les notifications", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showSuccess("Notif 1");
      result.current.showError("Notif 2");
      result.current.showInfo("Notif 3");
    });

    expect(result.current.notifications).toHaveLength(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});
```

### Styles CSS (optionnel)

```css
/* ===== styles/notifications.css ===== */

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  width: 100%;
}

.notification {
  animation: slideIn 0.3s ease-out;
}

.notification.closing {
  animation: slideOut 0.3s ease-out;
}

.notification-close:hover {
  opacity: 1 !important;
}
```

---

## Récapitulatif

Ces quatre exercices couvrent les concepts avancés de state management et custom hooks en React :

| Exercice                     | Concepts clés                                                                           | Difficulté |
| ---------------------------- | --------------------------------------------------------------------------------------- | ---------- |
| **useCurrency**              | Context + useReducer, localStorage, conversion                                          | Moyenne    |
| **Cart avec Save for Later** | Reducer complexe, persistance, codes promo, Container/Presentational, actions multiples | Élevée     |
| **Tour Search avec Context** | useReducer + Context, debounce, filtrage multi-critères, pattern Provider               | Moyenne    |
| **useNotifications**         | Context + Reducer, auto-dismiss, timers, empilage                                       | Élevée     |

### Principes appliqués

- ✅ **Single Responsibility** : Chaque reducer/context a une responsabilité unique
- ✅ **Separation of Concerns** : Container (logique) vs Presentational (UI)
- ✅ **DRY** : Logique réutilisable via custom hooks
- ✅ **Testabilité** : Tests unitaires pour reducers et hooks
- ✅ **Scalabilité** : Architecture extensible avec Context + useReducer

### Architecture finale

```
contexts/
├── CurrencyContext.js
├── CartContext.js
├── TourSearchContext.js
└── NotificationContext.js

reducers/
├── currency-reducer.js
├── cart-reducer.js
├── search-reducer.js
└── notification-reducer.js

hooks/
└── useCurrency.js (version autonome)

components/
├── containers/
│   └── CartContainer.jsx
├── presentational/
│   ├── CartItemDisplay.jsx
│   ├── PromoCodeInput.jsx
│   └── CartSummary.jsx
├── BookingActions.jsx
├── CurrencySelector.jsx
├── NotificationContainer.jsx
├── SearchBar.jsx
├── TourList.jsx
└── TourPrice.jsx
```

---

## Navigation

- **🏠 Retour** : [Leçon 3.6 - React Avancé : State Management et Hooks Personnalisés](../lecon-6-advanced-react-state-management.md)
- **📚 Sommaire** : [Module 3 - README](../README.md)
