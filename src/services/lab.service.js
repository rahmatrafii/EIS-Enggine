import prisma from '../config/prisma.js';
import { AppError } from '../utils/response.js';

/**
 * Membuat data game interactive lab baru.
 * 
 * @param {Object} payload
 * @param {number} payload.exhibitId
 * @param {string} payload.ageCategory
 * @param {string} payload.gameType
 * @param {string} payload.title
 * @param {Object} payload.gameConfig
 */
export const createLabGame = async ({ exhibitId, ageCategory, gameType, title, gameConfig }) => {
  try {
    // Cek apakah kandang (exhibitId) ada dan aktif
    const exhibit = await prisma.exhibit.findUnique({
      where: { id: exhibitId },
      select: { isActive: true }
    });

    if (!exhibit || !exhibit.isActive) {
      throw new AppError(404, 'EXHIBIT_NOT_FOUND', 'Kandang tidak ditemukan atau tidak aktif');
    }

    // Simpan data game baru ke database
    const game = await prisma.interactiveLabGame.create({
      data: {
        exhibitId,
        ageCategory,
        gameType,
        title,
        gameConfig,
        isActive: true
      }
    });

    return game;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat membuat game lab');
  }
};

/**
 * Mengambil daftar game berdasarkan ID kandang.
 * 
 * @param {number} exhibitId
 */
export const getLabGamesByExhibit = async (exhibitId) => {
  try {
    const games = await prisma.interactiveLabGame.findMany({
      where: { exhibitId },
      orderBy: { createdAt: 'desc' }
    });

    return games;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil daftar game lab');
  }
};

/**
 * Mengambil detail game tunggal.
 * 
 * @param {number} gameId
 */
export const getLabGameDetail = async (gameId) => {
  try {
    const game = await prisma.interactiveLabGame.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      throw new AppError(404, 'LAB_GAME_NOT_FOUND', 'Game lab tidak ditemukan');
    }

    return game;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat mengambil detail game lab');
  }
};

/**
 * Memperbarui data game.
 * 
 * @param {number} gameId
 * @param {Object} payload
 * @param {string} [payload.ageCategory]
 * @param {string} [payload.gameType]
 * @param {string} [payload.title]
 * @param {Object} [payload.gameConfig]
 * @param {boolean} [payload.isActive]
 */
export const updateLabGame = async (gameId, { ageCategory, gameType, title, gameConfig, isActive }) => {
  try {
    // Cek eksistensi game
    const existingGame = await prisma.interactiveLabGame.findUnique({
      where: { id: gameId },
      select: { id: true }
    });

    if (!existingGame) {
      throw new AppError(404, 'LAB_GAME_NOT_FOUND', 'Game lab tidak ditemukan');
    }

    // Update data
    const updatedGame = await prisma.interactiveLabGame.update({
      where: { id: gameId },
      data: {
        ageCategory,
        gameType,
        title,
        gameConfig,
        isActive
      }
    });

    return updatedGame;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat memperbarui game lab');
  }
};

/**
 * Menghapus data game (hard delete).
 * 
 * @param {number} gameId
 */
export const deleteLabGame = async (gameId) => {
  try {
    const existingGame = await prisma.interactiveLabGame.findUnique({
      where: { id: gameId },
      select: { id: true }
    });

    if (!existingGame) {
      throw new AppError(404, 'LAB_GAME_NOT_FOUND', 'Game lab tidak ditemukan');
    }

    await prisma.interactiveLabGame.delete({
      where: { id: gameId }
    });

    return { id: gameId };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem saat menghapus game lab');
  }
};
