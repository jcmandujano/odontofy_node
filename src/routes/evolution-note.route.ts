import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { createNote, deleteNote, getNote, listNotes, updateNote } from "../controllers/evolution-note.controller";

const router = Router();

router.get('/:patient_id/notes/', [
    validarJWT
], listNotes)
router.get('/:patient_id/notes/:id', [
    validarJWT
], getNote)
router.post('/:patient_id/notes/', [
    validarJWT
], createNote)
router.put('/:patient_id/notes/:id',[
    validarJWT
], updateNote)
router.delete('/:patient_id/notes/:id',[
    validarJWT
], deleteNote)

export default router;