/**
 * useNotifications - Module 5 - Hook pour notifications système navigateur
 *
 * Hook pour gérer les notifications système (browser notifications API).
 * Demande permission et affiche des notifications natives.
 */

import { useState, useEffect, useCallback } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState("default");
  const [isSupported, setIsSupported] = useState(false);

  // Vérifier le support des notifications
  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Demander la permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn("⚠️ Notifications non supportées par ce navigateur");
      return false;
    }

    if (permission === "granted") {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("❌ Erreur demande permission notifications:", error);
      return false;
    }
  }, [isSupported, permission]);

  // Afficher une notification
  const showNotification = useCallback(
    async (title, options = {}) => {
      if (!isSupported) {
        console.warn("⚠️ Notifications non supportées");
        return null;
      }

      if (permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          console.warn("⚠️ Permission notifications refusée");
          return null;
        }
      }

      try {
        const notification = new Notification(title, {
          icon: "/logo.png",
          badge: "/badge.png",
          vibrate: [200, 100, 200],
          tag: options.tag || "default",
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
          ...options,
        });

        // Auto-close après délai (si spécifié)
        if (options.duration) {
          setTimeout(() => {
            notification.close();
          }, options.duration);
        }

        // Event listeners
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          notification.close();

          if (options.onClick) {
            options.onClick(event);
          }
        };

        notification.onerror = (error) => {
          console.error("❌ Erreur notification:", error);
        };

        return notification;
      } catch (error) {
        console.error("❌ Erreur affichage notification:", error);
        return null;
      }
    },
    [isSupported, permission, requestPermission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    canShow: permission === "granted",
  };
}

export default useNotifications;
