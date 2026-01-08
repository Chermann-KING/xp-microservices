import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Providers - Module 3 Context API
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { CartProvider } from "./contexts/CartContext.jsx";
import { CurrencyProvider } from "./contexts/CurrencyContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import { WebSocketProvider } from "./contexts/WebSocketContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <CurrencyProvider>
          <CartProvider>
            <WebSocketProvider>
              <App />
            </WebSocketProvider>
          </CartProvider>
        </CurrencyProvider>
      </AuthProvider>
    </NotificationProvider>
  </React.StrictMode>
);
