//vamos a crear el contorlador de creacion de pagos
import { Request, Response } from "express"
import Payment from "../models/payment.model"
import PaymentUser from "../models/payment-user.model"
import Concept from "../models/concept.model"
import db from "../db/connection";
import UserConcept from "../models/user_concept.model";
import dayjs from "dayjs";
import { Op } from "sequelize";
import { successResponse, errorResponse } from "../utils/response";
import { PaginatedResponse } from "../types/api-response";

/**
 * Listar pagos de un paciente con paginación
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Lista paginada de pagos con sus conceptos
 */
export const listPayments = async (req: Request, res: Response) => {
  const { patient_id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: payments } = await Payment.findAndCountAll({
      where: { patientId: patient_id },
      limit,
      offset,
      order: [["payment_date", "DESC"]],
    });

    const paymentsWithConcepts = await Promise.all(
      payments.map(async (payment) => {
        const paymentConcepts = await PaymentUser.findAll({
          where: { paymentId: payment.id },
          include: [
            {
              model: UserConcept,
              as: "userConcept",
              attributes: ["id", "description"],
            },
          ],
        });

        return {
          ...payment.toJSON(),
          concepts: paymentConcepts.map((pc) => ({
            id: pc.id,
            conceptId: pc.conceptId,
            quantity: pc.quantity,
            paymentId: pc.paymentId,
            paymentMethod: pc.paymentMethod,
            description: pc.userConcept?.description || null,
          })),
        };
      })
    );

    const response: PaginatedResponse<typeof paymentsWithConcepts[number]> = {
      total: count,
      page,
      perPage: limit,
      totalPages: Math.ceil(count / limit),
      results: paymentsWithConcepts
    };

    return successResponse(res, response, 'payments fetched successfully');


  } catch (error) {
    console.error("Error in listPayments:", error);
    return errorResponse(res, "Failed to fetch payments", 500, error);
  }
};

/**
 * Obtener un pago específico por su ID
 * @param {Request} req
 * @param {Response} res
 * @returns {Response} Detalle del pago con sus conceptos
 */
export const getPayment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return errorResponse(res, "Payment not found", 404);
    }

    const paymentConcepts = await PaymentUser.findAll({
      where: { paymentId: parseInt(id) },
      include: { model: Concept, attributes: ["description", "unit_price"] },
    });

    const response = {
      ...payment.toJSON(),
      concepts: paymentConcepts.map((pc) => ({
        id: pc.id,
        conceptId: pc.conceptId,
        quantity: pc.quantity,
      })),
    };

    return successResponse(res, response, "Payment fetched successfully");
  } catch (error) {
    console.error("Error in getPayment:", error);
    return errorResponse(res, "Failed to fetch payment", 500, error);
  }
};

/**
 * Obtener el balance total de pagos, ingresos y deudas por usuario
 * @param {Request} req
 * @param {Response} res
 * @returns {Response} Totales agregados
 */
export const getPaymentBalancePerUser = async (req: Request, res: Response) => {
  const { authorUid } = req;
  const { currentMonthOnly } = req.query;

  try {
    let dateFilter = {};
    if (currentMonthOnly === "true") {
      dateFilter = {
        payment_date: {
          [Op.between]: [dayjs().startOf("month").toDate(), dayjs().endOf("month").toDate()],
        },
      };
    }

    const payments = await Payment.findAll({
      where: { user_id: authorUid, ...dateFilter },
    });

    const totalPayments = payments.reduce((acc, p) => acc + Number(p.total), 0);
    const totalDebt = payments.reduce((acc, p) => acc + Number(p.debt), 0);
    const totalIncome = payments.reduce((acc, p) => acc + Number(p.income), 0);

    return successResponse(res, { totalPayments, totalDebt, totalIncome }, "Balance fetched successfully");
  } catch (error) {
    console.error("Error in getPaymentBalancePerUser:", error);
    return errorResponse(res, "Failed to fetch balance", 500, error);
  }
};

/**
 * Crear un nuevo pago para un paciente específico
 * @param {Request} req
 * @param {Response} res
 * @returns {Response} Confirmación de creación del pago
 */
export const createPayment = async (req: Request, res: Response) => {
  const { patient_id } = req.params;
  const { body, authorUid } = req;

  try {
    const newPayment = await Payment.create({
      ...body,
      user_id: authorUid,
      patientId: parseInt(patient_id),
    });

    if (body.concepts?.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conceptsData = body.concepts.map((concept: any) => ({
        paymentId: newPayment.id,
        conceptId: concept.conceptId,
        paymentMethod: concept.paymentMethod,
        quantity: concept.quantity,
      }));

      await PaymentUser.bulkCreate(conceptsData);
    }

    return successResponse(res, newPayment, "Payment created successfully");
  } catch (error) {
    console.error("Error in createPayment:", error);
    return errorResponse(res, "Failed to create payment", 500, error);
  }
};



/**
 * Actualizar un pago existente
 * @param {Request} req
 * @param {Response} res
 * @returns {Response} Confirmación de actualización del pago
 */
export const updatePayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  const t = await db.transaction();

  try {
    const payment = await Payment.findOne({ where: { id }, transaction: t });

    if (!payment) {
      await t.rollback();
      return errorResponse(res, `Payment with ID ${id} not found`, 404);
    }

    await payment.update(
      {
        payment_date: body.payment_date,
        income: body.income,
        debt: body.debt,
        total: body.total,
      },
      { transaction: t }
    );

    if (Array.isArray(body.concepts)) {
      const currentPaymentUsers = await PaymentUser.findAll({
        where: { paymentId: id },
        transaction: t,
      });

      const currentMap = new Map(currentPaymentUsers.map((pu) => [pu.id, pu]));

      for (const concept of body.concepts) {
        if (concept.id && currentMap.has(concept.id)) {
          const existingPU = currentMap.get(concept.id);
          if (existingPU) {
            await existingPU.update(
              {
                quantity: concept.quantity,
                conceptId: concept.conceptId,
                paymentMethod: concept.paymentMethod,
              },
              { transaction: t }
            );
            currentMap.delete(concept.id);
          }
        } else {
          await PaymentUser.create(
            {
              paymentId: parseInt(id),
              conceptId: concept.conceptId,
              paymentMethod: concept.paymentMethod,
              quantity: concept.quantity,
            },
            { transaction: t }
          );
        }
      }

      // Eliminar los PaymentUser que ya no están
      for (const [idToDelete] of currentMap) {
        await PaymentUser.destroy({ where: { id: idToDelete }, transaction: t });
      }
    }

    await t.commit();
    return successResponse(res, null, "Payment updated successfully");
  } catch (error) {
    await t.rollback();
    console.error("Error in updatePayment:", error);
    return errorResponse(res, "Failed to update payment", 500, error);
  }
};


/**
 * Eliminar un pago y sus conceptos asociados
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Confirmación de eliminación
 */
export const deletePayment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return errorResponse(res, "Payment not found", 404);
    }

    // Eliminar los conceptos asociados
    await PaymentUser.destroy({ where: { paymentId: id } });

    // Eliminar el pago
    await payment.destroy();

    return successResponse(res, null, "Payment deleted successfully");
  } catch (error) {
    console.error("Error in deletePayment:", error);
    return errorResponse(res, "Failed to delete payment", 500, error);
  }
};

