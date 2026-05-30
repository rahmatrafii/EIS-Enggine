export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const sendSuccess = (res, statusCode, data, message = 'Success') => {
  const cleanedData = JSON.parse(JSON.stringify(data, (key, value) => {
    return value === null ? undefined : value;
  }));

  return res.status(statusCode).json({
    success: true,
    message,
    data: cleanedData
  });
};

export const sendError = (res, statusCode, code, message) => {
  return res.status(statusCode).json({
    success: false,
    code,
    message
  });
};
