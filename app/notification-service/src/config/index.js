import dotenv from "dotenv";
dotenv.config();

export default {
  service: {
    port: process.env.PORT || 3006,
    env: process.env.NODE_ENV || "development",
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    exchange: process.env.RABBITMQ_EXCHANGE || "tour_booking_events",
    queue: process.env.RABBITMQ_QUEUE || "notification_queue",
    routingKeys: [
      "booking.confirmed",
      "booking.cancelled",
      "payment.succeeded",
      "payment.failed",
      "tour.availability.low",
    ],
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    ttl: parseInt(process.env.REDIS_TTL) || 86400, // 24 heures
  },

  email: {
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT) || 2525,
    secure: false, // true pour port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: {
      email: process.env.SENDER_EMAIL || "noreply@bookingtourismapp.com",
      name: process.env.SENDER_NAME || "Booking Tourism App",
    },
  },

  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  push: {
    serverKey: process.env.FIREBASE_SERVER_KEY,
  },
};
