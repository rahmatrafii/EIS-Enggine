import * as adminService from '../services/admin.service.js';
import * as labService from '../services/lab.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * POST /api/v1/admin/exhibits
 * Create a new exhibit (kandang)
 */
export const createExhibit = async (req, res, next) => {
  try {
    const { name, zoneName, description, imageUrl } = req.body;
    
    const newExhibit = await adminService.createExhibit({
      name,
      zoneName,
      description,
      imageUrl,
    });

    return sendSuccess(res, 201, newExhibit, 'Exhibit berhasil dibuat');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/exhibits
 * Get all exhibits with optional filters
 */
export const getExhibits = async (req, res, next) => {
  try {
    const { is_active, zone_name } = req.query;
    
    const exhibits = await adminService.getExhibits({
      is_active,
      zone_name,
    });

    return sendSuccess(res, 200, exhibits, 'Daftar kandang berhasil diambil');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/exhibits/:exhibit_id
 * Get detail of a single exhibit including media and content
 */
export const getExhibitDetail = async (req, res, next) => {
  try {
    const { exhibit_id } = req.params;
    
    const exhibit = await adminService.getExhibitDetail(Number(exhibit_id));
    
    return sendSuccess(res, 200, exhibit, 'Detail kandang berhasil diambil');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/exhibits/:exhibit_id
 * Soft delete an exhibit (set isActive = false)
 */
export const deleteExhibit = async (req, res, next) => {
  try {
    const { exhibit_id } = req.params;
    
    const deletedExhibit = await adminService.deleteExhibit(exhibit_id);
    
    return sendSuccess(res, 200, deletedExhibit, 'Kandang berhasil dinonaktifkan');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/exhibits/:exhibit_id/activate
 * Activate an exhibit (set isActive = true)
 */
export const activateExhibit = async (req, res, next) => {
  try {
    const { exhibit_id } = req.params;
    
    const activatedExhibit = await adminService.activateExhibit(exhibit_id);
    
    return sendSuccess(res, 200, activatedExhibit, 'Kandang berhasil diaktifkan');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/exhibits/:exhibit_id/permanent
 * Hard delete an exhibit (permanently delete from database)
 */
export const hardDeleteExhibit = async (req, res, next) => {
  try {
    const { exhibit_id } = req.params;
    
    const result = await adminService.hardDeleteExhibit(exhibit_id);
    
    return sendSuccess(res, 200, result, 'Kandang berhasil dihapus secara permanen');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/exhibits/:exhibit_id
 * Update basic info of an exhibit (kandang)
 */
export const updateExhibit = async (req, res, next) => {
  try {
    const { exhibit_id } = req.params;
    const { name, zoneName, description, imageUrl } = req.body;

    const updatedExhibit = await adminService.updateExhibit(Number(exhibit_id), {
      name,
      zoneName,
      description,
      imageUrl,
    });

    return sendSuccess(res, 200, updatedExhibit, 'Exhibit berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/content
 * Create or update learning content for an exhibit and age category
 */
export const upsertContent = async (req, res, next) => {
  try {
    const { exhibitId, ageCategory, contentTitle, contentBody } = req.body;
    
    const content = await adminService.upsertContent({
      exhibitId,
      ageCategory,
      contentTitle,
      contentBody,
    });
    
    return sendSuccess(res, 200, content, 'Konten edukasi berhasil disimpan');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/media
 * Create media for an exhibit
 */
export const createMedia = async (req, res, next) => {
  try {
    const { exhibitId, ageCategory, mediaType, title, fileUrl } = req.body;
    
    const media = await adminService.createMedia({
      exhibitId,
      ageCategory,
      mediaType,
      title,
      fileUrl,
    });
    
    return sendSuccess(res, 201, media, 'Media berhasil ditambahkan');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/quizzes
 * Create a new quiz with its questions atomically
 */
export const createQuiz = async (req, res, next) => {
  try {
    const { exhibitId, scope, title, quizType, ageCategory, questions } = req.body;
    
    const result = await adminService.createQuiz({
      exhibitId,
      scope,
      title,
      quizType,
      ageCategory,
      questions,
    });
    
    return sendSuccess(res, 201, result, 'Kuis berhasil dibuat');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/quizzes
 * Get all quizzes (admin)
 */
export const getQuizzes = async (req, res, next) => {
  try {
    const { quizType, ageCategory, scope } = req.query;
    
    const quizzes = await adminService.getQuizzes({
      quizType,
      ageCategory,
      scope,
    });

    return sendSuccess(res, 200, quizzes, 'Daftar kuis berhasil diambil');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/quizzes/:quiz_id
 * Get detail of a single quiz (admin)
 */
export const getQuizDetail = async (req, res, next) => {
  try {
    const { quiz_id } = req.params;
    
    const quiz = await adminService.getQuizDetail(Number(quiz_id));
    
    return sendSuccess(res, 200, quiz, 'Detail kuis berhasil diambil');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/content/:id
 * Delete educational learning content (admin)
 */
export const deleteContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteContent(Number(id));
    return sendSuccess(res, 200, result, 'Materi edukasi berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/media/:id
 * Delete exhibit media (admin)
 */
export const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteMedia(Number(id));
    return sendSuccess(res, 200, result, 'Media berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/quizzes/:quiz_id
 * Update an existing quiz with its questions atomically (admin)
 */
export const updateQuiz = async (req, res, next) => {
  try {
    const { quiz_id } = req.params;
    const { exhibitId, scope, title, quizType, ageCategory, questions } = req.body;
    
    const result = await adminService.updateQuiz(Number(quiz_id), {
      exhibitId,
      scope,
      title,
      quizType,
      ageCategory,
      questions,
    });
    
    return sendSuccess(res, 200, result, 'Kuis berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/lab-games
 * Create a new interactive lab game
 */
export const createLabGame = async (req, res, next) => {
  try {
    const { exhibitId, ageCategory, gameType, title, gameConfig } = req.body;
    
    const newGame = await labService.createLabGame({
      exhibitId,
      ageCategory,
      gameType,
      title,
      gameConfig,
    });

    return sendSuccess(res, 201, newGame, 'Game lab interaktif berhasil dibuat');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/lab-games
 * Get all interactive lab games for an exhibit
 */
export const getLabGames = async (req, res, next) => {
  try {
    const { exhibit_id } = req.query;
    
    const games = await labService.getLabGamesByExhibit(Number(exhibit_id));

    return sendSuccess(res, 200, games, 'Daftar game lab interaktif berhasil diambil');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/lab-games/:game_id
 * Get detail of a single interactive lab game
 */
export const getLabGameDetail = async (req, res, next) => {
  try {
    const { game_id } = req.params;
    
    const game = await labService.getLabGameDetail(Number(game_id));

    return sendSuccess(res, 200, game, 'Detail game lab interaktif berhasil diambil');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/lab-games/:game_id
 * Update an existing interactive lab game
 */
export const updateLabGame = async (req, res, next) => {
  try {
    const { game_id } = req.params;
    const { ageCategory, gameType, title, gameConfig, isActive } = req.body;

    const updatedGame = await labService.updateLabGame(Number(game_id), {
      ageCategory,
      gameType,
      title,
      gameConfig,
      isActive,
    });

    return sendSuccess(res, 200, updatedGame, 'Game lab interaktif berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/lab-games/:game_id
 * Hard delete an interactive lab game
 */
export const deleteLabGame = async (req, res, next) => {
  try {
    const { game_id } = req.params;

    const result = await labService.deleteLabGame(Number(game_id));

    return sendSuccess(res, 200, result, 'Game lab interaktif berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/quizzes/:quiz_id
 * Hard delete a quiz and all its questions
 */
export const deleteQuiz = async (req, res, next) => {
  try {
    const { quiz_id } = req.params;

    const result = await adminService.deleteQuiz(Number(quiz_id));

    return sendSuccess(res, 200, result, 'Kuis berhasil dihapus');
  } catch (error) {
    next(error);
  }
};






