export const servicesConfig = {
  tourCatalog: {
    baseURL: process.env.TOUR_CATALOG_SERVICE_URL || "http://localhost:3001",
    apiPath: "/api/v1/tours-catalog",
    timeout: 5000,
  },
  paymentGateway: {
    baseURL: process.env.PAYMENT_GATEWAY_SERVICE_URL || "http://localhost:3003",
    apiPath: "/api/v1/payment-gateway",
    timeout: 5000,
  },
};
