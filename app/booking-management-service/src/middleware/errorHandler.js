export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: err.message,
        details: err.details || null,
      },
    });
  }

  if (err.name === "NotFoundError") {
    return res.status(404).json({
      status: "error",
      error: {
        code: err.code || "RESOURCE_NOT_FOUND",
        message: err.message,
        details: err.details || null,
      },
    });
  }

  if (err.name === "ConflictError") {
    return res.status(409).json({
      status: "error",
      error: {
        code: err.code || "CONFLICT",
        message: err.message,
        details: err.details || null,
      },
    });
  }

  res.status(err.statusCode || 500).json({
    status: "error",
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "An unexpected error occurred",
    },
  });
};

export class NotFoundError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = "NotFoundError";
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class ConflictError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = "ConflictError";
    this.code = code;
    this.details = details;
  }
}
