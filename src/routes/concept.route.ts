import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { listConcepts, getConcept, createConcept, updateConcept, deleteConcept } from "../controllers/concept.controller";

const router = Router();

router.get('/', [
    validarJWT
], listConcepts)
router.get('/:id', [
    validarJWT
], getConcept)
router.post('/', [
    validarJWT
], createConcept)
router.put('/:id',[
    validarJWT
], updateConcept)
router.delete('/:id',[
    validarJWT
], deleteConcept)

export default router;