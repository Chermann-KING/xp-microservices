/**
 * Frontend Logger - Envoi des logs vers Logstash
 * Module 6 - Leçon 6.5 : ELK Stack
 */

const LOGSTASH_URL =
  import.meta.env.VITE_LOGSTASH_URL || "http://localhost:5000";
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class Logger {
  constructor() {
    this.minLevel = import.meta.env.PROD ? LOG_LEVELS.info : LOG_LEVELS.debug;
    this.serviceName = "frontend";
    this.buffer = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 secondes

    // Démarrer le flush périodique
    if (import.meta.env.VITE_LOGSTASH_URL) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Créer un objet log structuré
   */
  createLogEntry(level, message, meta = {}) {
    return {
      level,
      service: this.serviceName,
      message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      ...meta,
    };
  }

  /**
   * Envoyer un log vers Logstash
   */
  async sendToLogstash(logEntry) {
    if (!import.meta.env.VITE_LOGSTASH_URL) {
      // Mode dev : log en console uniquement
      console.log("[Logger]", logEntry);
      return;
    }

    try {
      await fetch(LOGSTASH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logEntry),
        // Ne pas bloquer l'UI si Logstash est down
        keepalive: true,
      });
    } catch (error) {
      // Fail silently - ne pas casser l'app si Logstash est indisponible
      console.warn("Failed to send log to Logstash:", error);
    }
  }

  /**
   * Ajouter au buffer et envoyer par batch
   */
  addToBuffer(logEntry) {
    this.buffer.push(logEntry);

    // Flush si le buffer est plein
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Envoyer tous les logs du buffer
   */
  async flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    // Envoyer en parallèle
    await Promise.allSettled(logs.map((log) => this.sendToLogstash(log)));
  }

  /**
   * Flush périodique
   */
  startPeriodicFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Flush avant de quitter la page
    window.addEventListener("beforeunload", () => {
      this.flush();
    });
  }

  /**
   * Méthode générique de log
   */
  log(level, message, meta = {}) {
    if (LOG_LEVELS[level] < this.minLevel) {
      return;
    }

    const logEntry = this.createLogEntry(level, message, meta);

    // Log en console en développement
    if (import.meta.env.DEV) {
      const consoleMethod = level === "error" || level === "fatal" ? "error" : level === "warn" ? "warn" : "log";
      console[consoleMethod](`[${level.toUpperCase()}]`, message, meta);
    }

    // Envoyer vers Logstash
    this.addToBuffer(logEntry);
  }

  /**
   * Log DEBUG
   */
  debug(message, meta = {}) {
    this.log("debug", message, meta);
  }

  /**
   * Log INFO
   */
  info(message, meta = {}) {
    this.log("info", message, meta);
  }

  /**
   * Log WARN
   */
  warn(message, meta = {}) {
    this.log("warn", message, meta);
  }

  /**
   * Log ERROR
   */
  error(message, error = null, meta = {}) {
    this.log("error", message, {
      ...meta,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : null,
    });
  }

  /**
   * Log FATAL (erreur critique)
   */
  fatal(message, error = null, meta = {}) {
    this.log("fatal", message, {
      ...meta,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : null,
    });
  }

  /**
   * Logger une requête HTTP
   */
  logHttpRequest(method, url, status, duration, meta = {}) {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    this.log(level, `HTTP ${method} ${url}`, {
      ...meta,
      http: {
        method,
        url,
        status,
        duration,
      },
    });
  }

  /**
   * Logger une erreur d'API
   */
  logApiError(method, url, error, meta = {}) {
    this.error(`API Error: ${method} ${url}`, error, {
      ...meta,
      api: {
        method,
        url,
      },
    });
  }

  /**
   * Logger une action utilisateur
   */
  logUserAction(action, details = {}) {
    this.info(`User action: ${action}`, {
      userAction: {
        action,
        ...details,
      },
    });
  }

  /**
   * Logger une performance metric
   */
  logPerformance(metric, value, meta = {}) {
    this.info(`Performance: ${metric}`, {
      ...meta,
      performance: {
        metric,
        value,
      },
    });
  }
}

// Instance singleton
const logger = new Logger();

export default logger;

// Export des méthodes pour un usage direct
export const { debug, info, warn, error, fatal, logHttpRequest, logApiError, logUserAction, logPerformance } = logger;
