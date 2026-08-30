export default function errorMiddleware(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Server xatosi yuz berdi";

  console.error(`[Error] ${status} - ${message}`);

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
