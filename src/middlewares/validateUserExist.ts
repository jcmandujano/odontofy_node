import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';

export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
    const { authorUid } = req;

    if (typeof authorUid !== 'number') {
        return res.status(400).json({ msg: 'Invalid authorUid' });
    }

    const user = await User.findByPk(authorUid);
    if (!user) {
        return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    //req.user = user; // Adjuntar el usuario validado al request
    next();
};