import whatsappService from "./whatsappService.js";
import { normalizePhoneNumber } from "../../utils/index.js";
import appendToSheets from "./googleSheetsService.js";
import openAiService from "./openAiService.js";

class MessageHandler {
  constructor() {
    this.appointmentState = {};
    this.assistandState = {};
  }

  async handleAppointmentFlow(to, message) {
    const state = this.appointmentState[to];
    let response;

    switch (state.step) {
      case "name":
        state.name = message;
        state.step = "petName";
        response = "Gracias, cual es el nombre de tu mascota?";
        break;
      case "petName":
        state.petName = message;
        state.step = "petType";
        response =
          "Que tipo de mascota es? (por ejemplo: perro, gato, huron, etc..)";
        break;
      case "petType":
        state.petType = message;
        state.step = "reason";
        response = "Cual es el motivo de tu consuta?";
        break;
      case "reason":
        state.reason = message;
        response = this.completeAppointment(to);
        break;
    }
    await whatsappService.sendMessage(to, response);
  }

  completeAppointment(to) {
    const appointmet = this.appointmentState[to];
    delete this.appointmentState[to];
    const userData = [
      to,
      appointmet.name,
      appointmet.petName,
      appointmet.petType,
      appointmet.reason,
      new Date().toISOString(),
    ];

    appendToSheets(userData);
    return `Gracias por agendar tu cita
    Resumen de la cita:
    Nombre: ${appointmet.name}
    Nombre de la mascota: ${appointmet.petName}
    Tipo de mascota: ${appointmet.petType}
    Motivo de la consulta: ${appointmet.reason}
    Fecha de la consulta: ${appointmet.date}

    Nos pondremos en contacto contigo pronto, para confirmar la fecha y hora de tu cita.
    `;
  }

  async handleIncomingMessage(message, senderInfo) {
    const phoneNumber = normalizePhoneNumber(message.from);
    if (message?.type === "text") {
      const incomingMessage = message.text.body.toLowerCase().trim();
      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(phoneNumber, message.id, senderInfo);
        await this.sendWelcomeMenu(phoneNumber);
      } else if (
        incomingMessage === "document" ||
        incomingMessage === "image" ||
        incomingMessage === "audio" ||
        incomingMessage === "video"
      ) {
        await this.sendMedia(phoneNumber, incomingMessage);
      } else if (this.appointmentState[phoneNumber]) {
        this.handleAppointmentFlow(phoneNumber, incomingMessage);
      } else if (this.assistandState[phoneNumber]) {
        await this.hadleAssistandFlow(phoneNumber, incomingMessage);
      } else {
        const option = message.interactive.button_reply.id
        await this.handleMenuOption(phoneNumber, option);
      }
      await whatsappService.markAsRead(message.id);
    } else if (message?.type === "interactive") {
      const option = message?.interactive?.button_reply?.id
        .toLowerCase()
        .trim();
      await this.handleMenuOption(phoneNumber, option);
      await whatsappService.markAsRead(message.id);
    }
  }
  isGreeting(message) {
    const greetings = ["hola", "hello", "hi", "buenas"];
    return greetings.includes(message);
  }
  getSenderName(senderInfo) {
    return senderInfo.profile.name || senderInfo.wa_id || "";
  }
  async sendWelcomeMessage(to, messageId, senderInfo) {
    const senderName = this.getSenderName(senderInfo);
    const message = `Bienvenido a MEDPET, En que puedo ayudarte hoy?`;
    const welcomeMessage = `Hola ${senderName}, ${message}`;
    await whatsappService.sendMessage(to, welcomeMessage, messageId);
  }
  async sendWelcomeMenu(to) {
    const menuMessage = `Elige una opcion`;
    const buttons = [
      {
        type: "reply",
        reply: {
          id: "option_1",
          title: "Agendar",
        },
      },
      {
        type: "reply",
        reply: {
          id: "option_2",
          title: "Consultar",
        },
      },
      {
        type: "reply",
        reply: {
          id: "option_3",
          title: "Ubicacion",
        },
      },
    ];
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }
  async handleMenuOption(to, option) {
    let response;
    switch (option) {
      case "option_1":
        this.appointmentState[to] = { step: "name" };
        response = "Por favor, ingresa tu nombre: ";
        break;
      case "option_2":
        this.assistandState[to] = { step: "question" };
        response = "Realiza tu consulta";
        break;
      case "option_3":
        await this.sendLocation(to)
        response = "Te esperamos en nuestra sucursal";
        break;

      case "option_6":
        response =
          "Si esto es una emergencia te invitamos a llamar a nuestra linea de atencion";
        this.sendContact(to);
        break;
      default:
        response = "Lo siento, no entendi tu seleccion";
        break;
    }
    await whatsappService.sendMessage(to, response);
  }
  async sendMedia(to, option) {
    let mediaUrl;
    let caption;
    let type;
    switch (option) {
      case "video":
        mediaUrl = "https://s3.amazonaws.com/gndx.dev/medpet-video.mp4";
        caption = "¡Esto es una video!";
        type = "video";
        break;
      case "document":
        mediaUrl = "https://s3.amazonaws.com/gndx.dev/medpet-file.pdf";
        caption = "¡Esto es un PDF!";
        type = "document";
        break;

      case "audio":
        mediaUrl = "https://s3.amazonaws.com/gndx.dev/medpet-audio.aac";
        caption = "Bienvenido";
        type = "audio";
        break;

      case "image":
        mediaUrl = "https://s3.amazonaws.com/gndx.dev/medpet-imagen.png";
        caption = "¡Esto es una Imagen!";
        type = "image";
        break;

      default:
        break;
    }

    await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
  }
  async hadleAssistandFlow(to, message) {
    const state = this.assistandState[to];
    let response;

    const menuMessage = "La respuesta fue de tu ayuda?";
    const buttons = [
      {
        type: "reply",
        reply: {
          id: "option_4",
          title: "Si, Gracias",
        },
      },
      {
        type: "reply",
        reply: {
          id: "option_5",
          title: "Hacer otra pregunta",
        },
      },
      {
        type: "reply",
        reply: {
          id: "option_6",
          title: "Emergencia",
        },
      },
    ];

    if (state.step === "question") {
      response = await openAiService(message);
    }

    delete this.assistandState[to];
    await whatsappService.sendMessage(to, response);
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async sendContact(to) {
    const contact = {
      addresses: [
        {
          street: "123 Calle de las Mascotas",
          city: "Ciudad",
          state: "Estado",
          zip: "12345",
          country: "PaÃ­s",
          country_code: "PA",
          type: "WORK",
        },
      ],
      emails: [
        {
          email: "contacto@medpet.com",
          type: "WORK",
        },
      ],
      name: {
        formatted_name: "MedPet Contacto",
        first_name: "MedPet",
        last_name: "Contacto",
        middle_name: "",
        suffix: "",
        prefix: "",
      },
      org: {
        company: "MedPet",
        department: "AtenciÃ³n al Cliente",
        title: "Representante",
      },
      phones: [
        {
          phone: "+1234567890",
          wa_id: "1234567890",
          type: "WORK",
        },
      ],
      urls: [
        {
          url: "https://www.medpet.com",
          type: "WORK",
        },
      ],
    };
    await whatsappService.sendContactMessage(to, contact);
  }

  async sendLocation(to){
    const latitude = -32.966896
    const longitud = -60.654808
    const name = 'Frederico'
    const address = 'Galvez 1889, Rosario, Santa Fe'

    await whatsappService.sendLocationMessage(to, latitude, longitud, name, address)
  }
}

export default new MessageHandler();
