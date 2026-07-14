import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { createNote, deleteNote, getNote, listNotes, updateNote } from "../controllers/evolution-note.controller";
import {
    validateCreateEvolutionNote,
    validateEvolutionNoteIdParams,
    validateListEvolutionNotes,
    validateUpdateEvolutionNote,
} from "../middlewares/evolution-note.validators";

const router = Router();

router.get('/:patient_id/notes/', [
    validarJWT,
    ...validateListEvolutionNotes,
], listNotes)
router.get('/:patient_id/notes/:id', [
    validarJWT,
    ...validateEvolutionNoteIdParams,
], getNote)
router.post('/:patient_id/notes/', [
    validarJWT,
    ...validateCreateEvolutionNote,
], createNote)
router.put('/:patient_id/notes/:id',[
    validarJWT,
    ...validateUpdateEvolutionNote,
], updateNote)
router.delete('/:patient_id/notes/:id',[
    validarJWT,
    ...validateEvolutionNoteIdParams,
], deleteNote)

export default router;
