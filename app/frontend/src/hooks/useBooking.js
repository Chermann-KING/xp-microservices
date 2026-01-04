/**
 * useBooking - Module 3 - Custom Hook avec State Machine
 *
 * Gère le processus de réservation avec une machine à états.
 * États: idle → selecting → confirming → processing → success/error
 */

import { useReducer, useCallback } from "react";
import { useCart } from "../contexts/CartContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNotifications } from "../contexts/NotificationContext.jsx";

// États de la réservation
const BOOKING_STATES = {
  IDLE: "idle",
  SELECTING: "selecting",
  CONFIRMING: "confirming",
  PROCESSING: "processing",
  SUCCESS: "success",
  ERROR: "error",
};

// Transitions valides
const VALID_TRANSITIONS = {
  [BOOKING_STATES.IDLE]: [BOOKING_STATES.SELECTING],
  [BOOKING_STATES.SELECTING]: [BOOKING_STATES.CONFIRMING, BOOKING_STATES.IDLE],
  [BOOKING_STATES.CONFIRMING]: [
    BOOKING_STATES.PROCESSING,
    BOOKING_STATES.SELECTING,
  ],
  [BOOKING_STATES.PROCESSING]: [BOOKING_STATES.SUCCESS, BOOKING_STATES.ERROR],
  [BOOKING_STATES.SUCCESS]: [BOOKING_STATES.IDLE],
  [BOOKING_STATES.ERROR]: [BOOKING_STATES.CONFIRMING, BOOKING_STATES.IDLE],
};

// Actions
const ACTIONS = {
  START: "START_BOOKING",
  SELECT_OPTIONS: "SELECT_OPTIONS",
  CONFIRM: "CONFIRM",
  PROCESS: "PROCESS",
  COMPLETE: "COMPLETE",
  FAIL: "FAIL",
  RESET: "RESET",
  GO_BACK: "GO_BACK",
};

const initialState = {
  status: BOOKING_STATES.IDLE,
  tourId: null,
  selectedDate: null,
  participants: 1,
  contactInfo: null,
  paymentMethod: null,
  bookingResult: null,
  error: null,
};

function bookingReducer(state, action) {
  const canTransition = (newState) => {
    return VALID_TRANSITIONS[state.status]?.includes(newState);
  };

  switch (action.type) {
    case ACTIONS.START:
      if (!canTransition(BOOKING_STATES.SELECTING)) return state;
      return {
        ...initialState,
        status: BOOKING_STATES.SELECTING,
        tourId: action.payload.tourId,
      };

    case ACTIONS.SELECT_OPTIONS:
      return {
        ...state,
        selectedDate: action.payload.date,
        participants: action.payload.participants,
      };

    case ACTIONS.CONFIRM:
      if (!canTransition(BOOKING_STATES.CONFIRMING)) return state;
      return {
        ...state,
        status: BOOKING_STATES.CONFIRMING,
        contactInfo: action.payload.contactInfo,
        paymentMethod: action.payload.paymentMethod,
      };

    case ACTIONS.PROCESS:
      if (!canTransition(BOOKING_STATES.PROCESSING)) return state;
      return {
        ...state,
        status: BOOKING_STATES.PROCESSING,
      };

    case ACTIONS.COMPLETE:
      if (!canTransition(BOOKING_STATES.SUCCESS)) return state;
      return {
        ...state,
        status: BOOKING_STATES.SUCCESS,
        bookingResult: action.payload,
      };

    case ACTIONS.FAIL:
      if (!canTransition(BOOKING_STATES.ERROR)) return state;
      return {
        ...state,
        status: BOOKING_STATES.ERROR,
        error: action.payload,
      };

    case ACTIONS.GO_BACK:
      if (state.status === BOOKING_STATES.CONFIRMING) {
        return { ...state, status: BOOKING_STATES.SELECTING };
      }
      if (state.status === BOOKING_STATES.ERROR) {
        return { ...state, status: BOOKING_STATES.CONFIRMING, error: null };
      }
      return state;

    case ACTIONS.RESET:
      return initialState;

    default:
      return state;
  }
}

export function useBooking() {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const { clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { success, error } = useNotifications();

  const startBooking = useCallback((tourId) => {
    dispatch({ type: ACTIONS.START, payload: { tourId } });
  }, []);

  const selectOptions = useCallback((date, participants) => {
    dispatch({
      type: ACTIONS.SELECT_OPTIONS,
      payload: { date, participants },
    });
  }, []);

  const confirmBooking = useCallback((contactInfo, paymentMethod) => {
    dispatch({
      type: ACTIONS.CONFIRM,
      payload: { contactInfo, paymentMethod },
    });
  }, []);

  const processBooking = useCallback(async () => {
    if (!isAuthenticated) {
      error("Vous devez être connecté pour réserver");
      return;
    }

    dispatch({ type: ACTIONS.PROCESS });

    try {
      // Simulation API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = {
        bookingId: `BK-${Date.now()}`,
        status: "confirmed",
        createdAt: new Date().toISOString(),
      };

      dispatch({ type: ACTIONS.COMPLETE, payload: result });
      clearCart();
      success("Réservation confirmée !");
    } catch (err) {
      dispatch({ type: ACTIONS.FAIL, payload: err.message });
      error("Erreur lors de la réservation");
    }
  }, [isAuthenticated, clearCart, success, error]);

  const goBack = useCallback(() => {
    dispatch({ type: ACTIONS.GO_BACK });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: ACTIONS.RESET });
  }, []);

  return {
    ...state,
    // États dérivés
    isIdle: state.status === BOOKING_STATES.IDLE,
    isSelecting: state.status === BOOKING_STATES.SELECTING,
    isConfirming: state.status === BOOKING_STATES.CONFIRMING,
    isProcessing: state.status === BOOKING_STATES.PROCESSING,
    isSuccess: state.status === BOOKING_STATES.SUCCESS,
    isError: state.status === BOOKING_STATES.ERROR,
    // Actions
    startBooking,
    selectOptions,
    confirmBooking,
    processBooking,
    goBack,
    reset,
  };
}

export { BOOKING_STATES };
export default useBooking;
