/**
 * CartContext - Module 3 - Context API + useReducer
 *
 * Gère le panier de réservation avec persistence localStorage.
 * Implémente le pattern useReducer pour une gestion d'état complexe.
 *
 * Features:
 * - Ajout/suppression de tours
 * - Modification des quantités (participants)
 * - Save for later
 * - Persistence localStorage
 */

import { createContext, useContext, useReducer, useEffect } from "react";

// ===== ACTION TYPES =====
const CART_ACTIONS = {
  ADD_ITEM: "ADD_ITEM",
  REMOVE_ITEM: "REMOVE_ITEM",
  UPDATE_QUANTITY: "UPDATE_QUANTITY",
  SAVE_FOR_LATER: "SAVE_FOR_LATER",
  MOVE_TO_CART: "MOVE_TO_CART",
  CLEAR_CART: "CLEAR_CART",
  RESTORE_CART: "RESTORE_CART",
  SET_SELECTED_DATE: "SET_SELECTED_DATE",
};

// ===== INITIAL STATE =====
const initialState = {
  items: [], // Tours dans le panier
  savedItems: [], // Tours sauvegardés pour plus tard
  isLoading: true,
};

// ===== REDUCER =====
function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const existingIndex = state.items.findIndex(
        (item) =>
          item.tourId === action.payload.tourId &&
          item.selectedDate === action.payload.selectedDate
      );

      if (existingIndex >= 0) {
        // Tour déjà dans le panier avec même date: augmenter quantité
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          participants:
            updatedItems[existingIndex].participants +
            action.payload.participants,
        };
        return { ...state, items: updatedItems };
      }

      // Nouveau tour
      return {
        ...state,
        items: [
          ...state.items,
          {
            ...action.payload,
            addedAt: new Date().toISOString(),
          },
        ],
      };
    }

    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };

    case CART_ACTIONS.UPDATE_QUANTITY:
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, participants: action.payload.participants }
            : item
        ),
      };

    case CART_ACTIONS.SAVE_FOR_LATER: {
      const itemToSave = state.items.find((item) => item.id === action.payload);
      if (!itemToSave) return state;

      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        savedItems: [
          ...state.savedItems,
          { ...itemToSave, savedAt: new Date().toISOString() },
        ],
      };
    }

    case CART_ACTIONS.MOVE_TO_CART: {
      const itemToMove = state.savedItems.find(
        (item) => item.id === action.payload
      );
      if (!itemToMove) return state;

      return {
        ...state,
        savedItems: state.savedItems.filter(
          (item) => item.id !== action.payload
        ),
        items: [
          ...state.items,
          { ...itemToMove, addedAt: new Date().toISOString() },
        ],
      };
    }

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
      };

    case CART_ACTIONS.RESTORE_CART:
      return {
        ...state,
        items: action.payload.items || [],
        savedItems: action.payload.savedItems || [],
        isLoading: false,
      };

    case CART_ACTIONS.SET_SELECTED_DATE:
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, selectedDate: action.payload.date }
            : item
        ),
      };

    default:
      return state;
  }
}

// ===== CONTEXT =====
const CartContext = createContext(null);

// ===== PROVIDER =====
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Restaurer le panier depuis localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        dispatch({ type: CART_ACTIONS.RESTORE_CART, payload: cartData });
      } catch {
        dispatch({
          type: CART_ACTIONS.RESTORE_CART,
          payload: { items: [], savedItems: [] },
        });
      }
    } else {
      dispatch({
        type: CART_ACTIONS.RESTORE_CART,
        payload: { items: [], savedItems: [] },
      });
    }
  }, []);

  // Persister le panier dans localStorage
  useEffect(() => {
    if (!state.isLoading) {
      localStorage.setItem(
        "cart",
        JSON.stringify({
          items: state.items,
          savedItems: state.savedItems,
        })
      );
    }
  }, [state.items, state.savedItems, state.isLoading]);

  // ===== ACTIONS =====
  const addToCart = (tour, participants = 1, selectedDate = null) => {
    dispatch({
      type: CART_ACTIONS.ADD_ITEM,
      payload: {
        id: `${tour.id}-${selectedDate || "no-date"}-${Date.now()}`,
        tourId: tour.id,
        title: tour.title,
        price: tour.price,
        currency: tour.currency || "EUR",
        imageCover: tour.imageCover,
        duration: tour.duration,
        durationUnit: tour.durationUnit,
        participants,
        selectedDate,
      },
    });
  };

  const removeFromCart = (itemId) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: itemId });
  };

  const updateQuantity = (itemId, participants) => {
    if (participants < 1) return;
    dispatch({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { id: itemId, participants },
    });
  };

  const saveForLater = (itemId) => {
    dispatch({ type: CART_ACTIONS.SAVE_FOR_LATER, payload: itemId });
  };

  const moveToCart = (itemId) => {
    dispatch({ type: CART_ACTIONS.MOVE_TO_CART, payload: itemId });
  };

  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  };

  const setSelectedDate = (itemId, date) => {
    dispatch({
      type: CART_ACTIONS.SET_SELECTED_DATE,
      payload: { id: itemId, date },
    });
  };

  // ===== COMPUTED VALUES =====
  const cartTotal = state.items.reduce(
    (total, item) => total + item.price * item.participants,
    0
  );

  const itemCount = state.items.reduce(
    (count, item) => count + item.participants,
    0
  );

  const value = {
    items: state.items,
    savedItems: state.savedItems,
    isLoading: state.isLoading,
    cartTotal,
    itemCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    saveForLater,
    moveToCart,
    clearCart,
    setSelectedDate,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ===== CUSTOM HOOK =====
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart doit être utilisé dans un CartProvider");
  }
  return context;
}

export default CartContext;
