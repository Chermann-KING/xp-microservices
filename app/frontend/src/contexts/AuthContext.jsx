/**
 * AuthContext - Module 4 - Authentification avec JWT
 *
 * Gère l'état d'authentification global de l'application.
 * Utilise useReducer pour une gestion prévisible des états.
 * Intègre avec auth-service via API Gateway.
 *
 * Pattern : Context + Reducer + Custom Hook
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { authService } from "../services/authService";

// ===== ACTION TYPES =====
const AUTH_ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  RESTORE_SESSION: "RESTORE_SESSION",
  UPDATE_USER: "UPDATE_USER",
  REFRESH_TOKEN: "REFRESH_TOKEN",
  CLEAR_ERROR: "CLEAR_ERROR",
};

// ===== INITIAL STATE =====
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true au démarrage pour vérifier la session
  error: null,
};

// ===== REDUCER (logique pure) =====
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
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.RESTORE_SESSION:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        // Les tokens sont gérés par authService
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// ===== CONTEXT =====
const AuthContext = createContext(null);

// ===== PROVIDER =====
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restaurer la session au chargement
  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem("auth_user");
      const accessToken = localStorage.getItem("auth_access_token");

      if (storedUser && accessToken) {
        try {
          // Vérifier que le token est encore valide via le profil
          const profile = await authService.getProfile();
          dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: profile });
        } catch (error) {
          // Token expiré - essayer de rafraîchir
          const refreshToken = localStorage.getItem("auth_refresh_token");
          if (refreshToken) {
            try {
              await authService.refreshTokens();
              const user = JSON.parse(storedUser);
              dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: user });
            } catch {
              // Rafraîchissement échoué - déconnecter
              authService.clearTokens();
              dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: null });
            }
          } else {
            authService.clearTokens();
            dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: null });
          }
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: null });
      }
    };

    restoreSession();
  }, []);

  // ===== ACTIONS =====
  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const result = await authService.login(email, password);
      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: result.user });
      return { success: true, user: result.user };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Erreur de connexion";
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const result = await authService.register(userData);
      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: result.user });
      return { success: true, user: result.user };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Erreur d'inscription";
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Ignorer les erreurs de logout côté serveur
      console.warn("Logout error:", error);
    } finally {
      authService.clearTokens();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  const updateUser = useCallback(
    (userData) => {
      const updatedUser = { ...state.user, ...userData };
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: userData });
    },
    [state.user]
  );

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===== CUSTOM HOOK =====
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}

export default AuthContext;
