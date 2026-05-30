import * as trackService from '../services/track.service.js';
import { sendSuccess } from '../utils/response.js';

export const checkIn = async (req, res, next) => {
  try {
    const { sessionId, qrCodeIdentifier } = req.body;
    const userId = req.user.userId;
    
    const result = await trackService.checkIn(userId, sessionId, qrCodeIdentifier);
    
    return sendSuccess(res, 201, result, 'Check-in berhasil');
  } catch (error) {
    next(error);
  }
};

export const interact = async (req, res, next) => {
  try {
    const { interactionId, mediaType } = req.body;
    const userId = req.user.userId;

    const result = await trackService.interact(userId, interactionId, mediaType);

    return sendSuccess(res, 200, result, 'Interaksi berhasil dicatat');
  } catch (error) {
    next(error);
  }
};

export const labLog = async (req, res, next) => {
  try {
    const { interactionId, gameName, actionTaken, scoreAchieved } = req.body;
    const userId = req.user.userId;

    const result = await trackService.labLog(userId, interactionId, gameName, actionTaken, scoreAchieved);

    return sendSuccess(res, 201, result, 'Lab log berhasil dicatat');
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const { interactionId } = req.body;
    const userId = req.user.userId;

    const result = await trackService.checkOut(userId, interactionId);

    return sendSuccess(res, 200, result, 'Checkout berhasil');
  } catch (error) {
    next(error);
  }
};
