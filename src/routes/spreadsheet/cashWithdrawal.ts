import { Hono } from "hono";
import { getTransactionColumn } from '../../utils/getTransactionColumn';
import { getFirstEmptyCellInColumn } from '../../utils/getFirstEmptyCellInColumn'
import getAuthenticatedSheets from '../../utils/getAuthenticatedSheets';
import getPerDay from '../../utils/getPerDay';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import getFirstSheet from "../../utils/getFirstSheet";

export const cashWithdrawal = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T"

const schema = Type.Object({
  amount: Type.Number(),
  fare: Type.Number()

})
cashWithdrawal.post('/cashWithdrawal', tbValidator('json', schema), async (c) => {
  try {
    const body = await c.req.json();
    let { amount, fare } = body;

    const fistSheeName = await getFirstSheet(SPREADSHEET_ID);
    const sheets = await getAuthenticatedSheets();

    // Get current value of D1
    const d1Response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${fistSheeName}!D1`,
    });
    const d1CurrentRaw = (d1Response.data.values && d1Response.data.values[0] && d1Response.data.values[0][0]) ?? 0;
    const d1Current = Number(d1CurrentRaw) || 0;

    // Get current value of D2
    const d2Response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${fistSheeName}!D2`,
    });
    const d2CurrentRaw = (d2Response.data.values && d2Response.data.values[0] && d2Response.data.values[0][0]) ?? 0;
    const d2Current = Number(d2CurrentRaw) || 0;

    // Calculate new values
    const d1NewValue = d1Current - amount - fare;
    const d2NewValue = d2Current + amount;

    // Update D1
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${fistSheeName}!D1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[d1NewValue]] },
    });

    // Update D2
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${fistSheeName}!D2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[d2NewValue]] },
    });

    const responseData = {
      amount,
      fare,
      d1Before: d1Current,
      d1After: d1NewValue,
      d2Before: d2Current,
      d2After: d2NewValue
    }
    const res: GenericResponseInterface = {
      success: true,
      message: `Withdraw ${amount} successfully.`,
      data: responseData,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while withdraw money: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while withdraw money",
      data: null,
    };
    return c.json(response, 500);
  }
})