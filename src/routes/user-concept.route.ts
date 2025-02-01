import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { createUserConcept, deleteUserConcept, getUserConcept, listUserConcepts, updateUserConcept } from "../controllers/user-concept.controller";
import { validateUser } from "../middlewares/validateUserExist";

const router = Router();

router.get('/', [
    validarJWT,
    validateUser,
], listUserConcepts)
router.get('/:id', [
    validarJWT,
    validateUser,
], getUserConcept)
router.post('/', [
    validarJWT,
    validateUser
], createUserConcept)
router.put('/:id',[
    validarJWT,
    validateUser,
], updateUserConcept)
router.delete('/:id',[
    validarJWT,
    validateUser,
], deleteUserConcept)

export default router;