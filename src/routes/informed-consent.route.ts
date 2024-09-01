import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { listInformedConsent } from "../controllers/informed-consent.controller";

const router = Router();

router.get('/', [
    validarJWT
], listInformedConsent)

export default router;