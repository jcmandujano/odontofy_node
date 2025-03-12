//vamos a crear el contorlador de creacion de pagos
import { Request, Response } from "express"
import Payment from "../models/payment.model"
import PaymentUser from "../models/payment-user.model"
import Concept from "../models/concept.model"
import db from "../db/connection";
import UserConcept from "../models/user_concept.model";


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
            include: [
              {
                  model: UserConcept, 
                  as: 'userConcept', // 🔥 Asegurar que coincide con el alias en belongsTo
                  attributes: ['id', 'description'],
              }
          ]
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
            concepts: paymentConcepts.map((pc) => ({
              id: pc.id,
              conceptId: pc.conceptId,
              quantity: pc.quantity,
              paymentId: pc.paymentId,
              paymentMethod: pc.paymentMethod,
              description: pc.userConcept?.dataValues?.description || null,
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
            paymentId: parseInt(id, 10),
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

export const getPaymentBalancePerUser  = async (req: Request, res: Response) => {
    const { authorUid } = req;
    try {
        //variable que obtiene el payment por authorUid y suma el total
        const paymentsPerUser = await Payment.findAll({ where: { user_id: authorUid } });

        // Sumar los totales de los pagos
        const totalPayments = paymentsPerUser.reduce((acc, payment) => acc + Number(payment.total), 0);

        //Sumar los totales de debt
        const totalDebt = paymentsPerUser.reduce((acc, payment) => acc + Number(payment.debt), 0);

        const totalIncome = paymentsPerUser.reduce((acc, payment) => acc + Number(payment.income), 0);

        res.json({
            totalPayments,
            totalDebt,
            totalIncome
        })
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrió un problema al realizar tu solicitud',
            error
        })
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
                paymentMethod: concept.paymentMethod,
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

export const updatePayment = async (req: Request, res: Response) => {
  const { body } = req;
  const { id } = req.params;
  const t = await db.transaction();

  try {
    // Buscar el Payment por su ID y validar que pertenezca al paciente correcto
    const payment = await Payment.findOne({
      where: { id },
      transaction: t,
    });

    if (!payment) {
      await t.rollback();
      return res.status(404).json({ msg: "Payment no encontrado" });
    }

    // Actualizar los campos de Payment
    await payment.update(
      {
        payment_date: body.payment_date,
        income: body.income,
        debt: body.debt,
        total: body.total,
      },
      { transaction: t }
    );

    // Manejo de los PaymentUser
    if (Array.isArray(body.concepts)) {
      // Obtener los PaymentUser actuales
      const currentPaymentUsers = await PaymentUser.findAll({
        where: { paymentId: id },
        transaction: t,
      });
      
      // Crear un mapa de los PaymentUser existentes
      const currentPaymentUsersMap = new Map();
      currentPaymentUsers.forEach((pu) => {
        currentPaymentUsersMap.set(pu.id, pu);
      });

      // Procesar la lista de conceptos recibida
      for (const concept of body.concepts) {
        if (concept.id && currentPaymentUsersMap.has(concept.id)) {
          // Si el concepto ya existe, actualizarlo
          const existingPaymentUser = currentPaymentUsersMap.get(concept.id);

          // Forzar que Sequelize lo reconozca como modificado
          await existingPaymentUser.save({ transaction: t,  logging: console.log });
          
          currentPaymentUsersMap.delete(concept.id); // Eliminar del mapa para evitar su eliminación
        } else {
          // Si no existe, crearlo
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

      // Eliminar los registros que ya no están en la lista recibida
      for (const [ paymentUser] of currentPaymentUsersMap) {
        const deletablePaymentUser = await PaymentUser.findByPk(paymentUser)
        if (deletablePaymentUser) {
          await deletablePaymentUser.destroy({ transaction: t });
        }
      }
    }

    await t.commit();

    // Respuesta con el Payment actualizado
    res.json({
      msg: "Payment actualizado correctamente",
      payment,
      conceptsList: body.concepts,
    });
  } catch (error) {
    console.error("Error al actualizar el Pago:", error);
    await t.rollback();
    res.status(500).json({
      msg: "Ocurrió un error al actualizar el Payment",
      error,
    });
  }
};


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
