import { Router } from 'express';
import {
  createTreatmentPlan,
  deleteTreatmentPlan,
  getTreatmentPlanById,
  getTreatmentPlansByPatient,
  updateTreatmentPlan,
  updateTreatmentPlanStatus,
} from '../controllers/treatment-plan.controller';
import {
  createTreatmentPlanItem,
  deleteTreatmentPlanItem,
  updateTreatmentPlanItem,
  updateTreatmentPlanItemStatus,
} from '../controllers/treatment-plan-item.controller';
import { validarJWT } from '../middlewares/validar-jwt';
import {
  validateCreateTreatmentPlan,
  validateCreateTreatmentPlanItem,
  validateDeleteTreatmentPlanItem,
  validatePatientTreatmentPlansParams,
  validateTreatmentPlanIdParam,
  validateUpdateTreatmentPlan,
  validateUpdateTreatmentPlanItem,
  validateUpdateTreatmentPlanItemStatus,
  validateUpdateTreatmentPlanStatus,
} from '../middlewares/treatment-plan.validators';

const router = Router();

router.get('/patients/:patientId/treatment-plans', [
  validarJWT,
  ...validatePatientTreatmentPlansParams,
], getTreatmentPlansByPatient);

router.post('/patients/:patientId/treatment-plans', [
  validarJWT,
  ...validateCreateTreatmentPlan,
], createTreatmentPlan);

router.get('/treatment-plans/:id', [
  validarJWT,
  ...validateTreatmentPlanIdParam,
], getTreatmentPlanById);

router.put('/treatment-plans/:id', [
  validarJWT,
  ...validateUpdateTreatmentPlan,
], updateTreatmentPlan);

router.delete('/treatment-plans/:id', [
  validarJWT,
  ...validateTreatmentPlanIdParam,
], deleteTreatmentPlan);

router.patch('/treatment-plans/:id/status', [
  validarJWT,
  ...validateUpdateTreatmentPlanStatus,
], updateTreatmentPlanStatus);

router.post('/treatment-plans/:id/items', [
  validarJWT,
  ...validateCreateTreatmentPlanItem,
], createTreatmentPlanItem);

router.put('/treatment-plans/:id/items/:itemId', [
  validarJWT,
  ...validateUpdateTreatmentPlanItem,
], updateTreatmentPlanItem);

router.delete('/treatment-plans/:id/items/:itemId', [
  validarJWT,
  ...validateDeleteTreatmentPlanItem,
], deleteTreatmentPlanItem);

router.patch('/treatment-plans/:id/items/:itemId/status', [
  validarJWT,
  ...validateUpdateTreatmentPlanItemStatus,
], updateTreatmentPlanItemStatus);

export default router;
