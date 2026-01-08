/**
 * NotificationPermissionBanner - Module 5 - Demande permission notifications
 *
 * Banner affiché en haut de page pour demander la permission des notifications système.
 * S'affiche seulement si non accordée et peut être fermé.
 */

import { useState, useEffect } from "react";
import { useNotifications } from "../../hooks/useNotifications";

export default function NotificationPermissionBanner() {
  const { isSupported, permission, requestPermission } = useNotifications();
  const [isDismissed, setIsDismissed] = useState(false);

  // Charger l'état dismissed depuis localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem("notification-banner-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      setIsDismissed(true);
      localStorage.setItem("notification-banner-dismissed", "true");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  // Ne pas afficher si :
  // - Non supporté
  // - Permission déjà accordée
  // - Banner fermé manuellement
  if (
    !isSupported ||
    permission === "granted" ||
    isDismissed ||
    permission === "denied"
  ) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Activez les notifications pour ne rien manquer !
              </p>
              <p className="text-xs text-blue-700">
                Recevez des alertes en temps réel quand les places se font
                rares.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Activer
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-blue-600 text-sm font-medium hover:bg-blue-100 rounded-lg transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
