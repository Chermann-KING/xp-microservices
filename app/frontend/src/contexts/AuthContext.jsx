/**
 * AuthContext - Module 3 - Context API + useReducer
 *
 * Gère l'état d'authentification global de l'application.
 * Utilise useReducer pour une gestion prévisible des états.
 *
 * Pattern : Context + Reducer + Custom Hook
 */

import { createContext, useContext, useReducer, useEffect } from "react";

// ===== ACTION TYPES =====
const AUTH_ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  RESTORE_SESSION: "RESTORE_SESSION",
  UPDATE_USER: "UPDATE_USER",
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
    const storedUser = localStorage.getItem("auth_user");
    const storedToken = localStorage.getItem("auth_token");

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: user });
      } catch {
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_token");
        dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: null });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.RESTORE_SESSION, payload: null });
    }
  }, []);

  // ===== ACTIONS =====
  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      // Simulation API call (à remplacer par vrai appel)
      const response = await fakeLoginAPI(email, password);

      localStorage.setItem("auth_user", JSON.stringify(response.user));
      localStorage.setItem("auth_token", response.token);

      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: response.user });
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem("auth_user", JSON.stringify(updatedUser));
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: userData });
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
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

// ===== FAKE API (à remplacer) =====
async function fakeLoginAPI(email, password) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (email === "test@example.com" && password === "password") {
    return {
      user: {
        id: "1",
        email,
        firstName: "Jean",
        lastName: "Dupont",
        role: "user",
      },
      token: "fake-jwt-token",
    };
  }

  throw new Error("Email ou mot de passe incorrect");
}

export default AuthContext;
