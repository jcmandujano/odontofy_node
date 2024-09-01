//funciones que se iran llamando eventualmente
//por ahora las notas se consultan por paciente
import { Request, Response } from "express"
import EvolutionNote from "../models/evolution-note.model";

export const listNotes = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id
    const notes = await EvolutionNote.findAll({
        where: {
            patient_id: patientId
        }
      });
    
    res.json({
        notes
    })
}

export const getNote = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id
    const { id } = req.params;
    const note = await EvolutionNote.findOne({
        where: {
            id: id,
            patient_id: patientId
        }
      });
    if(note){
        res.json({
            note
        })
    }else{
        res.status(404).json({
            msg: 'Nota no encontrada'
        })
    }
}

export const createNote = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id
    const { body } = req;
    const note = new EvolutionNote(body)
    try {
        note.patient_id = parseInt(patientId)
        const newNote = await EvolutionNote.create(note.dataValues);
        res.json({
            msg: 'Se creo correctamente la informacion',
            patient: newNote
        })
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const updateNote = async (req: Request, res: Response) => {  
    const { id } = req.params;
    const { body } = req;
    try {
        const note = await EvolutionNote.findByPk(id);
        if(!note){
            return res.status(404).json({
                msg: 'No existe una nota con el id ' + id
            })
        }
        
        await note.update(body);
        res.json(note)

    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const deleteNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const note = await EvolutionNote.findByPk(id);
        if(!note){
            return res.status(404).json({
                msg: 'No existe una nota con el id' + id
            })
        }
        await note.destroy()
        res.json({
            msg: 'El registro ha sido eliminado correctamente'
        })    
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}