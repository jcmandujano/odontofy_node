import { Router } from 'express';
import {
  createTreatmentPlan,
  deleteTreatmentPlan,
  getTreatmentPlanById,
  getTreatmentPlansByPatient,
  updateTreatmentPlan,
  updateTreatmentPlanStatus,
} from '../controllers/treatment-plan.controller';
import { validarJWT } from '../middlewares/validar-jwt';
import {
  validateCreateTreatmentPlan,
  validatePatientTreatmentPlansParams,
  validateTreatmentPlanIdParam,
  validateUpdateTreatmentPlan,
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

export default router;
