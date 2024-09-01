import { Request, Response } from "express"
import InformedConsent from "../models/informed-consent.model"

export const listInformedConsent = async (req: Request, res: Response) => {
    const informedConsents = await InformedConsent.findAll();
    res.json({
        data: informedConsents
    })
}