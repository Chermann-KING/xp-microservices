import axios from "axios";
import { servicesConfig } from "../config/services.js";

const tourCatalogAPI = axios.create({
  baseURL: `${servicesConfig.tourCatalog.baseURL}${servicesConfig.tourCatalog.apiPath}`,
  timeout: servicesConfig.tourCatalog.timeout,
});

/**
 * Récupère les détails d'une visite depuis le Tour Catalog
 */
export const getTourDetails = async (tourId) => {
  try {
    const response = await tourCatalogAPI.get(`/tours/${tourId}`);
    return response.data.data.tour;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch tour details: ${error.message}`);
  }
};

/**
 * Vérifie si une visite existe
 */
export const tourExists = async (tourId) => {
  const tour = await getTourDetails(tourId);
  return tour !== null;
};
