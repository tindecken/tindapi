import { Hono } from "hono";
import getPerDay from '../../utils/getPerDay';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import getFirstSheet from "../../utils/getFirstSheet";
import getValueByName from "../../utils/getValueByName";
import updateValueByName from "../../utils/updateValueByName";

export const reconcilliation = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const schema = Type.Object({
  atm: Type.Number(),
  cash: Type.Number(),
})
reconcilliation.post('/reconcilliation', tbValidator('json', schema), async (c) => {
  try {
    const body = await c.req.json();
    let { atm, cash } = body;

    // Get the first sheet name
    const firstSheetName = await getFirstSheet(SPREADSHEET_ID!);

    // Get current values from the sheet
    const taCurrentRaw = await getValueByName(firstSheetName, "ta");
    const tvCurrentRaw = await getValueByName(firstSheetName, "tv");
    const atmCurrentRaw = await getValueByName(firstSheetName, "atm");
    const cashCurrentRaw = await getValueByName(firstSheetName, "cash");

    const taCurrent = Number(taCurrentRaw) || 0;
    const tvCurrent = Number(tvCurrentRaw) || 0;
    const atmCurrent = Number(atmCurrentRaw) || 0;
    const cashCurrent = Number(cashCurrentRaw) || 0;

    // Calculate new values based on formulas:
    // set value of "ta" by: current value of ta - value of atm + input atm
    // set value of "tv" by: current value of tv - value of cash + input cash
    const taNewValue = taCurrent - atmCurrent + atm;
    const tvNewValue = tvCurrent - cashCurrent + cash;

    // Update values in the sheet
    await updateValueByName(firstSheetName, "ta", taNewValue);
    await updateValueByName(firstSheetName, "tv", tvNewValue);

    // get updated per day value
    const perDayAfter = await getPerDay()
    const responseData = {
      perDayAfter
    }
    const res: GenericResponseInterface = {
      success: true,
      message: 'Reconcilliation successfully.',
      data: responseData,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while reconcilliation: ${error.message || error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while reconcilliation",
      data: null,
    };
    return c.json(response, 500);
  }
})