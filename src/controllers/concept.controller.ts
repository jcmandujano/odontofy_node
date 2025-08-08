//funciones que se iran llamando eventualmente
import { Request, Response } from "express"
import Concept from "../models/concept.model"
import { errorResponse, successResponse } from "../utils/response";

export const listConcepts = async (req: Request, res: Response) => {
    const concepts = await Concept.findAll();
    return successResponse(res, concepts, 'Concepts obtained successfully');
}

export const getConcept = async (req: Request, res: Response) => {
    const { id } = req.params;
    const concept = await Concept.findByPk(id);
    if (concept) {
        return successResponse(res, concept, 'concept obtained successfully');
    } else {
        return errorResponse(res, 'Concept not found', 404);
    }
}