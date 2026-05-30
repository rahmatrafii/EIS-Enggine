import { AppError } from '../utils/response.js'

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const messages = result.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ')
    return next(new AppError(400, 'VALIDATION_ERROR', messages))
  }
  req.body = result.data
  next()
}

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query)
  if (!result.success) {
    const messages = result.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ')
    return next(new AppError(400, 'VALIDATION_ERROR', messages))
  }
  // FIX: Express 5 req.query adalah read-only getter — tidak bisa di-assign langsung
  // Gunakan Object.defineProperty untuk override, atau inject ke req langsung
  Object.defineProperty(req, 'query', {
    value: result.data,
    writable: true,
    configurable: true,
  })
  next()
}

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params)
  if (!result.success) {
    const messages = result.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ')
    return next(new AppError(400, 'VALIDATION_ERROR', messages))
  }
  req.params = result.data
  next()
}