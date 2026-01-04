/**
 * NotificationContainer - UI Component
 * Affiche les notifications/toasts
 */

import {
  useNotifications,
  NOTIFICATION_TYPES,
} from "../../contexts/NotificationContext.jsx";

const ICONS = {
  [NOTIFICATION_TYPES.SUCCESS]: "✅",
  [NOTIFICATION_TYPES.ERROR]: "❌",
  [NOTIFICATION_TYPES.WARNING]: "⚠️",
  [NOTIFICATION_TYPES.INFO]: "ℹ️",
};

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification--${notification.type}`}
        >
          <span className="notification__icon">{ICONS[notification.type]}</span>
          <div className="notification__content">
            {notification.title && (
              <strong className="notification__title">
                {notification.title}
              </strong>
            )}
            <p className="notification__message">{notification.message}</p>
          </div>
          {notification.dismissible && (
            <button
              className="notification__close"
              onClick={() => removeNotification(notification.id)}
            >
              ×
            </button>
          )}
        </div>
      ))}

      <style>{`
        .notification-container {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-width: 400px;
        }
        .notification {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.5rem;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .notification--success { border-left: 4px solid var(--success-color); }
        .notification--error { border-left: 4px solid var(--error-color); }
        .notification--warning { border-left: 4px solid var(--warning-color); }
        .notification--info { border-left: 4px solid var(--primary-color); }
        .notification__icon {
          font-size: 1.25rem;
        }
        .notification__content {
          flex: 1;
        }
        .notification__title {
          display: block;
          margin-bottom: 0.25rem;
        }
        .notification__message {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .notification__close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-secondary);
          line-height: 1;
        }
      `}</style>
    </div>
  );
}

export default NotificationContainer;
