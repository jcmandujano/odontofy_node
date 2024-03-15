import  nodemailer from "nodemailer";

export const sendEmail = async(from: string, to: string, subject: string, body: string) => {
    try {
        
        let mailOptions = ({
            from,
            to,
            subject,
            body
        })

        //asign createTransport method in nodemailer to a variable
        //service: to determine which email platform to use
        //auth contains the senders email and password which are all saved in the .env
        const Transporter = nodemailer.createTransport({
            service: "smtp.mailgun.org",
            port: 587,
            auth: {
              user: 'postmaster@sandbox4fc9c94bd9da4cae9fbcd7403b6e6873.mailgun.org', //only for develop
              pass: "dc2f9bb76a1e40fc8c09757645274374-408f32f3-df3f0625", //only for develop
            },
          });

        //return the Transporter variable which has the sendMail method to send the mail
        //which is within the mailOptions
        return await Transporter.sendMail(mailOptions).then(info=>{
            console.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
        }); 
    } catch (error) {
        return {
            msg: "No se pudo enviar tu email",
            error
        }
    }
}