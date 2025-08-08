import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { listConcepts, getConcept } from "../controllers/concept.controller";

const router = Router();

router.get('/', [
    validarJWT
], listConcepts)
router.get('/:id', [
    validarJWT
], getConcept)

export default router;