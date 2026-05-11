import { Hono } from "hono";
import { getTransactionColumn } from '../../utils/getTransactionColumn';
import { getFirstEmptyCellInColumn } from '../../utils/getFirstEmptyCellInColumn';
import getAuthenticatedSheets from '../../utils/getAuthenticatedSheets';
import getPerDay from '../../utils/getPerDay';
import { tbValidator } from '@hono/typebox-validator';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import getFirstSheet from "../../utils/getFirstSheet";

export const addTransactionForMustPay = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T"

const schema = Type.Object({
  day: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  amount: Type.Number(),
  note: Type.Optional(Type.String()),
  isPaybyCash: Type.Boolean(),
  mustPay: Type.Object({
    name: Type.String(),
    amount: Type.Number(),
    cell: Type.String(),
  })

})
addTransactionForMustPay.post('/addTransactionForMustPay', tbValidator('json', schema), async (c) => {
  try {
    const body = await c.req.json();
    let { day, amount, isPaybyCash, mustPay, note } = body;
    const { name: mustPayName, amount: mustPayAmount, cell: mustPayCell } = mustPay;

    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();
    const firstSheetName = await getFirstSheet(SPREADSHEET_ID);

    // 1. Add new transaction record
    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);
    const transactionCell = await getFirstEmptyCellInColumn(transactionSheet, `${transactionColumn}2`, SPREADSHEET_ID);
    
    if (!day) {
      day = new Date().getDate().toString();
    }

    // Get per day value before update
    const perDayBefore = await getPerDay();

    // Add transaction to transaction sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}!${transactionCell}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[day, `${mustPayName}${note ? ` - ${note}` : ""}`, amount, isPaybyCash ? "x" : ""]]
      },
    });

    // 2. Update or delete mustPay record
    if (amount === mustPayAmount) {
      // Delete the record (clear both name and amount cells)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${firstSheetName}!${mustPayCell}:${String.fromCharCode(mustPayCell.charCodeAt(0) + 1)}${mustPayCell.substring(1)}`,
      });
    } else {
      // Update the amount
      const newAmount = mustPayAmount - amount;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${firstSheetName}!${String.fromCharCode(mustPayCell.charCodeAt(0) + 1)}${mustPayCell.substring(1)}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[newAmount]]
        },
      });
    }

    // Get updated per day value
    const perDayAfter = await getPerDay();

    const res: GenericResponseInterface = {
      success: true,
      message: 'Add mustPay transaction successfully.',
      data: {
        sheet: transactionSheet,
        cell: transactionCell,
        day,
        note: `${mustPayName}${note ? ` - ${note}` : ""}`,
        amount,
        isPaybyCash,
        perDayBefore,
        perDayAfter
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while update cells: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while update cells",
      data: null,
    };
    return c.json(response, 500);
  }
})