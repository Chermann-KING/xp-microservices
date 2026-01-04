/**
 * CurrencyContext - Module 3 - Context API + Custom Hook
 *
 * Gère la devise et la conversion des prix dans toute l'application.
 * Exemple pratique d'un Context simple avec état et fonctions utilitaires.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

// Taux de conversion (base EUR)
const EXCHANGE_RATES = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  CHF: 0.95,
  CAD: 1.47,
};

const CURRENCY_SYMBOLS = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF",
  CAD: "CA$",
};

const CURRENCY_NAMES = {
  EUR: "Euro",
  USD: "Dollar américain",
  GBP: "Livre sterling",
  CHF: "Franc suisse",
  CAD: "Dollar canadien",
};

// ===== CONTEXT =====
const CurrencyContext = createContext(null);

// ===== PROVIDER =====
export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem("preferred_currency") || "EUR";
  });

  // Changer la devise
  const changeCurrency = useCallback((newCurrency) => {
    if (EXCHANGE_RATES[newCurrency]) {
      setCurrency(newCurrency);
      localStorage.setItem("preferred_currency", newCurrency);
    }
  }, []);

  // Convertir un montant de EUR vers la devise actuelle
  const convert = useCallback(
    (amountInEur, fromCurrency = "EUR") => {
      if (fromCurrency === currency) return amountInEur;

      // Convertir d'abord en EUR si nécessaire
      const amountInEurNormalized =
        fromCurrency !== "EUR"
          ? amountInEur / EXCHANGE_RATES[fromCurrency]
          : amountInEur;

      // Puis convertir vers la devise cible
      return amountInEurNormalized * EXCHANGE_RATES[currency];
    },
    [currency]
  );

  // Formater un montant avec le symbole de la devise
  const format = useCallback(
    (amount, options = {}) => {
      const { showSymbol = true, decimals = 2 } = options;
      const convertedAmount = convert(amount, options.fromCurrency);
      const formatted = convertedAmount.toFixed(decimals);

      if (showSymbol) {
        return `${formatted} ${CURRENCY_SYMBOLS[currency]}`;
      }
      return formatted;
    },
    [currency, convert]
  );

  // Liste des devises disponibles
  const availableCurrencies = useMemo(
    () =>
      Object.keys(EXCHANGE_RATES).map((code) => ({
        code,
        symbol: CURRENCY_SYMBOLS[code],
        name: CURRENCY_NAMES[code],
        rate: EXCHANGE_RATES[code],
      })),
    []
  );

  const value = useMemo(
    () => ({
      currency,
      symbol: CURRENCY_SYMBOLS[currency],
      name: CURRENCY_NAMES[currency],
      rate: EXCHANGE_RATES[currency],
      changeCurrency,
      convert,
      format,
      availableCurrencies,
    }),
    [currency, changeCurrency, convert, format, availableCurrencies]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ===== CUSTOM HOOK =====
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency doit être utilisé dans un CurrencyProvider");
  }
  return context;
}

export default CurrencyContext;
