import { Request, Response } from "express"
import InformedConsent from "../models/informed-consent.model"
import { successResponse } from "../utils/response";

export const listInformedConsent = async (req: Request, res: Response) => {
    const informedConsents = await InformedConsent.findAll();
    return successResponse(res, informedConsents, 'Informed consents obtained successfully');

}