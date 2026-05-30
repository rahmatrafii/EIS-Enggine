import * as adminService from '../services/admin.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * POST /api/v1/admin/exhibits
 * Create a new exhibit (kandang)
 */
export const createExhibit = async (req, res, next) => {
  try {
    const { name, zoneName, description } = req.body;
    
    const newExhibit = await adminService.createExhibit({
      name,
      zoneName,
      description,
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





