import { Router } from "express";
import { createUser, deleteUser, getUser, getUsers, updateUser } from "../controllers/user.controller";
import { validarJWT } from "../middlewares/validar-jwt";

const router = Router();

router.get('/', getUsers)
router.get('/:id', getUser)
router.post('/', createUser)
router.put('/:id',[
    validarJWT
], updateUser)
router.delete('/:id', deleteUser)

export default router;