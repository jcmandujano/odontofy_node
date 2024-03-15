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
        const existEmail = await User.findOne({
            where: {
                email: body.email
            }
        })

        if(existEmail){
            return res.status(400).json({
                msg: 'El email que deseas registrar ya existe'
            })
        }
        const newUser = await User.create(body);
        res.json(newUser)
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body } = req;
    try {
        const user = await User.findByPk(id);
        if(!user){
            return res.status(404).json({
                msg: 'No existe un usuario con el id ' + id
            })
        }

        if(body.email){
            const existEmail = await User.findOne({
                where: {
                    email: body.email
                }
            });
    
            if(existEmail){
                return res.status(400).json({
                    msg: 'El email que deseas actualizar ya existe'
                })
            }
        }

        await user.update(body);
        res.json(user)

    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if(!user){
            return res.status(404).json({
                msg: 'No existe un usuario con el id' + id
            })
        }
        await user.update({status: false});
        res.json({
            msg: 'El usuario ha sido eliminado correctamente'
        })    
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
    
}