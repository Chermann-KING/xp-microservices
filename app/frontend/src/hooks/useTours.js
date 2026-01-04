/**
 * useTours - Module 3 - Custom Hook pour les données
 *
 * Gère le fetching et le filtrage des tours depuis l'API.
 * Utilise useReducer pour l'état complexe de recherche/filtrage.
 */

import { useReducer, useEffect, useCallback } from "react";
import api from "../services/api.js";

// Actions
const ACTIONS = {
  FETCH_START: "FETCH_START",
  FETCH_SUCCESS: "FETCH_SUCCESS",
  FETCH_ERROR: "FETCH_ERROR",
  SET_FILTERS: "SET_FILTERS",
  RESET_FILTERS: "RESET_FILTERS",
  SET_PAGE: "SET_PAGE",
};

const initialFilters = {
  search: "",
  destination: "",
  minPrice: "",
  maxPrice: "",
  difficulty: "",
  sortBy: "createdAt",
  sortOrder: "DESC",
};

const initialState = {
  tours: [],
  isLoading: false,
  error: null,
  filters: initialFilters,
  pagination: {
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0,
  },
};

function toursReducer(state, action) {
  switch (action.type) {
    case ACTIONS.FETCH_START:
      return { ...state, isLoading: true, error: null };

    case ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        tours: action.payload.data,
        pagination: {
          ...state.pagination,
          ...action.payload.pagination,
        },
      };

    case ACTIONS.FETCH_ERROR:
      return { ...state, isLoading: false, error: action.payload };

    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 }, // Reset page on filter change
      };

    case ACTIONS.RESET_FILTERS:
      return {
        ...state,
        filters: initialFilters,
        pagination: { ...state.pagination, page: 1 },
      };

    case ACTIONS.SET_PAGE:
      return {
        ...state,
        pagination: { ...state.pagination, page: action.payload },
      };

    default:
      return state;
  }
}

export function useTours(autoFetch = true) {
  const [state, dispatch] = useReducer(toursReducer, initialState);

  const fetchTours = useCallback(async () => {
    dispatch({ type: ACTIONS.FETCH_START });

    try {
      const params = {
        ...state.filters,
        page: state.pagination.page,
        limit: state.pagination.limit,
      };

      // Nettoyer les params vides
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await api.get("/tours", { params });

      dispatch({
        type: ACTIONS.FETCH_SUCCESS,
        payload: response.data,
      });
    } catch (err) {
      dispatch({
        type: ACTIONS.FETCH_ERROR,
        payload: err.response?.data?.error?.message || err.message,
      });
    }
  }, [state.filters, state.pagination.page, state.pagination.limit]);

  // Auto-fetch au montage et changement de filtres/page
  useEffect(() => {
    if (autoFetch) {
      fetchTours();
    }
  }, [fetchTours, autoFetch]);

  const setFilters = useCallback((newFilters) => {
    dispatch({ type: ACTIONS.SET_FILTERS, payload: newFilters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_FILTERS });
  }, []);

  const setPage = useCallback((page) => {
    dispatch({ type: ACTIONS.SET_PAGE, payload: page });
  }, []);

  const refetch = useCallback(() => {
    fetchTours();
  }, [fetchTours]);

  return {
    tours: state.tours,
    isLoading: state.isLoading,
    error: state.error,
    filters: state.filters,
    pagination: state.pagination,
    setFilters,
    resetFilters,
    setPage,
    refetch,
  };
}

export default useTours;
