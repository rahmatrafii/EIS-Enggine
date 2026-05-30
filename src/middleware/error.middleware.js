import { sendError } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, code, message } = err;

  // Tangkap Error Bawaan Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'Data yang anda masukkan telah ada di database (Duplikat).';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'Record data tidak ditemukan di database.';
    }
  }

  // Jika error bukan instansiasi AppError (e.g., error library/sintaks)
  if (!statusCode) {
    statusCode = 500;
    code = 'INTERNAL_ERROR';
    message = 'Terjadi kesalahan sistem di server.';
    // Log SEMUA environment agar tidak blind saat debug test
    console.error(`[ERROR HANDLER] ${err.name}: ${err.message}`);
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${code}: ${message}`, err.stack);
  }

  return sendError(res, statusCode, code, message);
};