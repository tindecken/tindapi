import { Hono } from "hono";
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import getAuthenticatedSheets from "../../utils/getAuthenticatedSheets";
import getFirstSheet from "../../utils/getFirstSheet";
import getValueByName from "../../utils/getValueByName";

export const getHoangRemaining = new Hono();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

getHoangRemaining.get('/hoangRemaining', async (c) => {
  try {
    let atm = 0
    let cash = 0
    let dayLeft = 0
    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();
    
    // Get the first sheet name
    const firstSheet = await getFirstSheet(SPREADSHEET_ID);
    const dayLeftValue = await getValueByName(firstSheet, "Day Left", true);
    dayLeft = typeof dayLeftValue === 'number' ? dayLeftValue : parseFloat(String(dayLeftValue || 0)) || 0;
    // Read columns C (name) and D (value) from the first sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID!,
      range: `${firstSheet}!C:D`,
    });

    const rows = response.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || [];
      const name = (row[0]?.toString() || '').trim(); // Column C
      const valueStr = (row[1]?.toString() || '').trim(); // Column D
      const valueNum = parseFloat(valueStr) || 0;

      if (name === 'atm') {
        atm = valueNum;
      } else if (name === 'cash') {
        cash = valueNum;
      }
    }

    const res: GenericResponseInterface = {
      success: true,
      message: 'Retrieved Hoang remaining successfully',
      data: {
        atm: atm,
        cash: cash,
        dayLeft: dayLeft
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while retrieving Hoang remaining: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving Hoang remaining",
      data: null,
    };
    return c.json(response, 500);
  }
})

// Helper function to convert column letter to index (A -> 0, B -> 1, etc.)
const letterToColumn = (letters: string): number => {
  let column = 0;
  const upperLetters = letters.toUpperCase();
  for (let i = 0; i < upperLetters.length; i++) {
    column = column * 26 + (upperLetters.charCodeAt(i) - 64);
  }
  return column - 1; // Convert to 0-based index
};