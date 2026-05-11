import { Hono } from "hono";
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import { getValueByName } from "../../utils/getValueByName";
import getFirstSheet from "../../utils/getFirstSheet";

export const getCurrentAmounts = new Hono();

getCurrentAmounts.get('/getCurrentAmounts', async (c) => {
  try {
    // Get atm value from first sheet
    const firstSheet = await getFirstSheet();
    const atmRaw = await getValueByName(firstSheet, "atm");
    const atm = Number(atmRaw) || 0;

    // Get cash value from first sheet
    const cashRaw = await getValueByName(firstSheet, "cash");
    const cash = Number(cashRaw) || 0;

    const res: GenericResponseInterface = {
      success: true,
      message: 'Retrieved current amounts successfully',
      data: {
        atm: atm,
        cash: cash,
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while retrieving current amounts: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving current amounts",
      data: null,
    };
    return c.json(response, 500);
  }
})
