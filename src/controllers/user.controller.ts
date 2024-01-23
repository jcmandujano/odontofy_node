//funciones que se iran llamando eventualmente
import { Request, Response } from "express"
import User from "../models/user.model"

export const getUsers = async (req: Request, res: Response) => {

    const users = await User.findAll();
    
    res.json({
        users
    })
}

export const getUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if(user){
        res.json({
            user
        })
    }else{
        res.status(404).json({
            msg: 'Usuario no encontrado'
        })
    }
}

export const createUser = async (req: Request, res: Response) => {
    const { body } = req;

    try {
        const newUser = await User.create(body);
        res.json(newUser)
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar esta solicitud'
        })
    }
}

export const updateUser = (req: Request, res: Response) => {
    const { id } = req.params;
    const { body } = req;
    res.json({
        msg: 'actualiza un usuario',
        body,
        id
    })
}

export const deleteUser = (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({
        msg: 'elimina un usuario',
        id
    })
}