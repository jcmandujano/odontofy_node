//vamos a crear el contorlador de creacion de pagos
import { Request, Response } from "express"
import Payment from "../models/payment.model"
import PaymentUser from "../models/payment-user.model"
import Concept from "../models/concept.model"
import db from "../db/connection";


export const listPayments  = async (req: Request, res: Response) => {  
    try {

        const payments = await Payment.findAll();
        // Para cada pago, buscar sus conceptos asociados
        const paymentsWithConcepts = await Promise.all(
            payments.map(async (payment) => {
            // Buscar los conceptos asociados al pago en la tabla intermedia
            const paymentConcepts = await PaymentUser.findAll({
                where: {
                paymentId: payment.id,
            },
            include: Concept, // Incluir el modelo Concept para acceder a sus propiedades
          });
  
          // Construir el objeto del pago con los conceptos asociados
          const paymentWithConcepts = {
            id: payment.id,
            user_id: payment.user_id,
            patientId: payment.patientId,
            payment_date: payment.payment_date,
            income: payment.income,
            debt: payment.debt,
            total: payment.total,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            paymentConcepts: paymentConcepts.map((pc) => ({
              id: pc.id,
              conceptId: pc.conceptId,
              quantity: pc.quantity,
              payment: pc.paymentId
              /* concept: {
                description: pc.Concept.description,
                unit_price: pc.Concept.unit_price,
              }, */
            })),
          };
  
          return paymentWithConcepts;
        })
      );
  
      res.json(paymentsWithConcepts);
        
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrió un problema al realizar tu solicitud',
            error,
        });
    }


}

export const getPayment  = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Buscamos el pago por su ID
        const payment = await Payment.findByPk(id);
        if (!payment) {
          return res.status(404).json({
            msg: 'No se encontró el pago con el ID proporcionado',
          });
        }
    
        // Buscamos los conceptos asociados a este pago en la tabla intermedia
        const paymentConcepts = await PaymentUser.findAll({
          where: {
            paymentId: id,
          },
          include: {
            model: Concept,
            attributes: ['description', 'unit_price'],
          },
        });
    
        // Construir el objeto de respuesta combinando el pago y los conceptos asociados
        const paymentWithConcepts = {
          id: payment.id,
          user_id: payment.user_id,
          patientId: payment.patientId,
          payment_date: payment.payment_date,
          income: payment.income,
          debt: payment.debt,
          total: payment.total,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          paymentConcepts: paymentConcepts.map((pc) => ({
            id: pc.id,
            conceptId: pc.conceptId,
            quantity: pc.quantity
           /*  concept: {
              description: pc.Concept.description,
              unit_price: pc.Concept.unit_price,
            }, */
          })),
        };
    
        res.json(paymentWithConcepts);
      }  catch (error) {
        res.status(500).json({
            msg: 'Ocurrió un problema al realizar tu solicitud',
            error,
        });
    }
}

export const createPayment  = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id
    const { body, authorUid } = req;
    const newPayment = new Payment(body)
    newPayment.user_id = authorUid ? authorUid : 0
    newPayment.patientId = patientId ? parseInt(patientId) : 0
    try {
        const payment = await Payment.create(newPayment.dataValues);
        if(body.concepts && body.concepts.length  > 0){
            const paymentConceptsData = body.concepts.map((concept: any) => ({
                paymentId: payment.id,
                conceptId: concept.conceptId,
                quantity: concept.quantity,
              }));
        
              await PaymentUser.bulkCreate(paymentConceptsData);
        }
        res.json({
            msg: 'El pago se ha generado satisfactoriamente',
        })
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const updatePayment  = async (req: Request, res: Response) => {
    const { body } = req;
    const { id } = req.params;
    const t = await db.transaction();
    try {
        // Buscar el Payment por su ID
        const payment = await Payment.findByPk(id, { transaction: t });
        const conceptsList = body.concepts
        if (!payment) {
          return res.status(404).json({ msg: 'Payment no encontrado' });
        }
        // Actualizar los campos del Payment con los datos recibidos en el body
        await payment.update(body, { transaction: t });

        if(body.concepts && body.concepts.length  > 0){
          for (const concept of body.concepts) {
            // Buscar el PaymentConcept por conceptId dentro de la transacción
            const paymentConcept = await PaymentUser.findOne({
              where: {
                paymentId: id,//this is a paymentId
                id: concept.id,
              }
            });
    
            // Verificar si se encontró el PaymentConcept
            if (!paymentConcept) {
              await t.rollback(); // Revertir la transacción si el PaymentConcept no fue encontrado
              return res.status(404).json({ msg: 'PaymentConcept no encontrado' });
            }
            await paymentConcept.update(concept, { transaction: t })
          }
        }
        
        await t.commit();

        // Respuesta con el Payment actualizado
        res.json({
          payment,
          conceptsList
        });
      } catch (error) {
        console.error('Error al actualizar el Pago:', error);
        res.status(500).json({ msg: 'Ocurrió un error al actualizar el Payment', error });
        await t.rollback();
      }

}

export const deletePayment  = async (req: Request, res: Response) => {
  const { id } = req.params;
  const t = await db.transaction();
  try {
     // Buscar el Payment por su ID
    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ msg: 'Pago no encontrado' });
    }
    
    //por integridad referencial primero eliminamos los conceptos relacionados al pago y despues el pago
    await PaymentUser.destroy({ where: { paymentId: id }, transaction: t });

    await payment.destroy({ transaction: t });

    await t.commit();


    res.json({
      msg: 'El pago y sus conceptos asociados han sido eliminados correctamente'
  })    

  } catch (error) {
    console.error('Error al eliminar el pago:', error);
    res.status(500).json({ msg: 'Ocurrió un error al eliminar el Payment', error });
    await t.rollback();
  }

}
