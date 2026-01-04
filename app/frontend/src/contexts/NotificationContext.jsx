/**
 * NotificationContext - Module 3 - Context API + useReducer
 *
 * Système de notifications global (toasts) pour l'application.
 * Implémente le pattern Context + Reducer avec auto-dismiss.
 */

import { createContext, useContext, useReducer, useCallback } from "react";

// ===== ACTION TYPES =====
const NOTIFICATION_ACTIONS = {
  ADD: "ADD_NOTIFICATION",
  REMOVE: "REMOVE_NOTIFICATION",
  CLEAR_ALL: "CLEAR_ALL_NOTIFICATIONS",
};

// ===== NOTIFICATION TYPES =====
export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

// ===== INITIAL STATE =====
const initialState = {
  notifications: [],
};

// ===== REDUCER =====
function notificationReducer(state, action) {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.ADD:
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };

    case NOTIFICATION_ACTIONS.REMOVE:
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload
        ),
      };

    case NOTIFICATION_ACTIONS.CLEAR_ALL:
      return {
        ...state,
        notifications: [],
      };

    default:
      return state;
  }
}

// ===== CONTEXT =====
const NotificationContext = createContext(null);

// ===== PROVIDER =====
export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Ajouter une notification
  const addNotification = useCallback((notification) => {
    const id = `notification-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newNotification = {
      id,
      type: notification.type || NOTIFICATION_TYPES.INFO,
      message: notification.message,
      title: notification.title,
      duration: notification.duration ?? 5000, // 5 secondes par défaut
      dismissible: notification.dismissible ?? true,
    };

    dispatch({ type: NOTIFICATION_ACTIONS.ADD, payload: newNotification });

    // Auto-dismiss
    if (newNotification.duration > 0) {
      setTimeout(() => {
        dispatch({ type: NOTIFICATION_ACTIONS.REMOVE, payload: id });
      }, newNotification.duration);
    }

    return id;
  }, []);

  // Supprimer une notification
  const removeNotification = useCallback((id) => {
    dispatch({ type: NOTIFICATION_ACTIONS.REMOVE, payload: id });
  }, []);

  // Vider toutes les notifications
  const clearAll = useCallback(() => {
    dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ALL });
  }, []);

  // Helpers pour chaque type
  const success = useCallback(
    (message, options = {}) => {
      return addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.SUCCESS,
      });
    },
    [addNotification]
  );

  const error = useCallback(
    (message, options = {}) => {
      return addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.ERROR,
        duration: options.duration ?? 8000, // Plus long pour les erreurs
      });
    },
    [addNotification]
  );

  const warning = useCallback(
    (message, options = {}) => {
      return addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.WARNING,
      });
    },
    [addNotification]
  );

  const info = useCallback(
    (message, options = {}) => {
      return addNotification({
        ...options,
        message,
        type: NOTIFICATION_TYPES.INFO,
      });
    },
    [addNotification]
  );

  const value = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ===== CUSTOM HOOK =====
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications doit être utilisé dans un NotificationProvider"
    );
  }
  return context;
}

export default NotificationContext;
