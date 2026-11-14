// Custom error type carrying an HTTP status code. Thrown by services/controllers
// and converted into a JSON response by the central error handler.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Not authenticated') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Not authorized') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }
}

export default ApiError;
