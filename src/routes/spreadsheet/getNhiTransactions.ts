import { Hono } from "hono";
import { getTransactionColumn } from '../../utils/getTransactionColumn';
import getAuthenticatedSheets from '../../utils/getAuthenticatedSheets';
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import getFirstSheet from "../../utils/getFirstSheet";

export const getNhiTransactions = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T"

getNhiTransactions.get('/getNhiTransactions', async (c) => {
  try {
    const fistSheeName = await getFirstSheet(SPREADSHEET_ID);
    const sheets = await getAuthenticatedSheets();

    // Get all values from C7 downwards (C:D columns starting from row 7)
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${fistSheeName}!C7:D`,
    });

    const rows = result.data.values;

    if (!rows || rows.length === 0) {
      const response: GenericResponseInterface = {
        success: true,
        message: 'No Nhi transactions found',
        data: {
          transactions: [],
          total: 0
        },
      };
      return c.json(response, 200);
    }

    // Process rows to extract transactions
    const transactions: Array<{ name: string; amount: number }> = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Check if column C (index 0) has a value
      if (row && row[0] !== null && row[0] !== undefined && row[0] !== '') {
        const name = String(row[0]);
        const amountRaw = row[1];
        const amount = Number(amountRaw) || 0;
        
        transactions.push({
          name,
          amount
        });
      }
    }

    // Calculate total sum of all amounts
    const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    const res: GenericResponseInterface = {
      success: true,
      message: 'Nhi transactions retrieved successfully',
      data: {
        transactions,
        total
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while retrieving Nhi transactions: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving Nhi transactions",
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