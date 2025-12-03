import { google } from "googleapis";
import config from "../config/env.js";
const sheets = google.sheets("v4");

async function addRowtoSheet(auth, spreadsheetId, values) {
  const request = {
    spreadsheetId,
    range: "reservas",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: [values],
    },
    auth,
  };

  try {
    const response = (await sheets.spreadsheets.values.append(request)).data;
    return response;
  } catch (error) {
    console.error(error);
  }
}

const appendToSheets = async (data) => {
  try {
    const credentials = JSON.parse(
      Buffer.from(config.GOOGLE_CREDENTIALS, "base64").toString()
    );
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const autClient = await auth.getClient();
    const spreadsheetId = "1sC0Vn7bTHfDevOWIfbc2XSIUrE3OEmEoUG2dfGPYh5I";
    await addRowtoSheet(autClient, spreadsheetId, data);
    return "Datos correctamente agregados.";
  } catch (error) {
    console.error(error);
  }
};

export default appendToSheets;
