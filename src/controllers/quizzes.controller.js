import * as quizzesService from '../services/quizzes.service.js';
import { sendSuccess } from '../utils/response.js';

export const fetchQuiz = async (req, res, next) => {
  try {
    // userId disuntikkan oleh auth.middleware dari JWT payload
    const userId = req.user.userId;

    // req.query telah divalidasi dan di-coerce oleh validateQuery(fetchQuizSchema)
    const { sessionId, type, exhibitId } = req.query;

    const quiz = await quizzesService.fetchQuiz(userId, sessionId, type, exhibitId);

    return sendSuccess(res, 200, quiz, 'Data kuis berhasil diambil');
  } catch (error) {
    console.error('FETCH QUIZ ERROR:', error);
    next(error);
  }
};

export const submitQuiz = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { sessionId, quizId, answers } = req.body;

    const result = await quizzesService.submitQuiz(userId, sessionId, quizId, answers);

    return sendSuccess(res, 201, result, 'Jawaban kuis berhasil disubmit');
  } catch (error) {
    next(error);
  }
};

export const getQuizResult = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { session_id } = req.params;

    const result = await quizzesService.getQuizResult(userId, session_id);

    return sendSuccess(res, 200, result, 'Hasil kuis berhasil diambil');
  } catch (error) {
    next(error);
  }
};

export const getRetentionStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await quizzesService.getRetentionStatus(userId);

    return sendSuccess(res, 200, result, 'Status jadwal retensi berhasil diambil');
  } catch (error) {
    next(error);
  }
};
