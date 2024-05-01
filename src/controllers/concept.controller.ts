//funciones que se iran llamando eventualmente
import { Request, Response } from "express"
import Concept from "../models/concept.model"

export const listConcepts  = async (req: Request, res: Response) => {
    const concepts = await Concept.findAll();
    res.json({
        concepts
    })
}

export const getConcept  = async (req: Request, res: Response) => {
    const { id } = req.params;
    const concept = await Concept.findByPk(id);
    if(concept){
        res.json({
            concept
        })
    }else{
        res.status(404).json({
            msg: 'Concepto no encontrado'
        })
    }
}
export const createConcept  = async (req: Request, res: Response) => {}
export const updateConcept  = async (req: Request, res: Response) => {}
export const deleteConcept  = async (req: Request, res: Response) => {}
