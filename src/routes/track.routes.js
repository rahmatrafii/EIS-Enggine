import { Router } from 'express';
import * as trackController from '../controllers/track.controller.js';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkinSchema, interactSchema, labLogSchema, checkoutSchema, getVisitorLabGamesQuerySchema } from '../validators/track.validator.js';

const router = Router();

router.post('/checkin', authenticate, validate(checkinSchema), trackController.checkIn);
router.patch('/interact', authenticate, validate(interactSchema), trackController.interact);
router.post('/lab-log', authenticate, validate(labLogSchema), trackController.labLog);
router.post('/checkout', authenticate, validate(checkoutSchema), trackController.checkOut);
router.get('/lab-games', authenticate, validateQuery(getVisitorLabGamesQuerySchema), trackController.getLabGamesForVisitor);

export default router;
