import { Hono } from "hono";
import { getTransactionColumn } from '../../utils/getTransactionColumn';
import getFirstSheet from "../../utils/getFirstSheet";
import { getFirstEmptyCellInColumn } from '../../utils/getFirstEmptyCellInColumn'
import getValueByName from '../../utils/getValueByName';
import updateValueByName from '../../utils/updateValueByName';
import getAuthenticatedSheets from '../../utils/getAuthenticatedSheets';
import getPerDay from '../../utils/getPerDay';
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'

export const giveNhi = new Hono();
const schema = Type.Object({
  amount: Type.Number(),
  isCash: Type.Boolean(),
})
// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T";

giveNhi.post('/giveNhi', tbValidator('json', schema), async (c) => {
  try {
    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();

    const body = await c.req.json();
    const { amount, isCash } = body;

    if (!amount || isCash === undefined || isCash === null) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'Invalid request',
        data: null,
      };
      return c.json(response, 400);
    }

    const firstSheetName = await getFirstSheet(SPREADSHEET_ID);

    // Get current values
    const currentTvRaw = await getValueByName(firstSheetName, "tv");
    const currentTaRaw = await getValueByName(firstSheetName, "ta");

    const currentTv = Number(currentTvRaw) || 0;
    const currentTa = Number(currentTaRaw) || 0;

    // Add new Nhi transaction
    // note = "dua", price = input amount, isCash ? "x" : ""
    const note = "[N] dua";
    const price = amount;

    const NhiTransactionCell = await getFirstEmptyCellInColumn(firstSheetName, 'C7', SPREADSHEET_ID);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${firstSheetName}!${NhiTransactionCell}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[note, price, isCash ? "x" : ""]] },
    });

    let updatedTv = currentTv;
    let updatedTa = currentTa;

    if (isCash) {
      // if input isCash = true, the value of "tv" should be: tv=current value + input amount
      updatedTv = currentTv + amount;
      await updateValueByName(firstSheetName, "tv", updatedTv);
    } else {
      // if input isCash = false, the value of "ta" should be: ta=current value + input amount
      updatedTa = currentTa + amount;
      await updateValueByName(firstSheetName, "ta", updatedTa);
    }

    // Add new Transaction in transaction sheet T
    // day = today day, note = "dua Nhi", price = input amount, isPaybyCash = isCash ? "x" : ""
    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);
    const transacitonCell = await getFirstEmptyCellInColumn(transactionSheet, `${transactionColumn}2`, SPREADSHEET_ID);
    const todayDay = new Date().getDate();
    const transactionValues = [[todayDay, "[N] dua Nhi", amount, isCash ? "x" : ""]];
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}!${transacitonCell}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: transactionValues },
    });

    const response: GenericResponseInterface = {
      success: true,
      message: 'Give Nhi successfully',
      data: {
        amount,
        isCash,
        previousTv: currentTv,
        previousTa: currentTa,
        updatedTv: isCash ? updatedTv : currentTv,
        updatedTa: !isCash ? updatedTa : currentTa
      },
    };
    return c.json(response, 200);

  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while giving Nhi: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while giving Nhi",
      data: null,
    };
    return c.json(response, 500);
  }
})
