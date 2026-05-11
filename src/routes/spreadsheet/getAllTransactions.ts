import { Hono } from "hono";
import { getTransactionColumn } from '../../utils/getTransactionColumn';
import getAuthenticatedSheets from '../../utils/getAuthenticatedSheets';
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';

export const getAllTransactions = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T"

getAllTransactions.get('/allTransactions', async (c) => {
  try {
    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();

    // Get the transaction column
    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);

    // Get all values from the transaction sheet
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}`,
    });

    const rows = result.data.values;

    if (!rows || rows.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found',
        data: null,
      };
      return c.json(response, 404);
    }

    // Find all rows with data in the transaction column
    const colIndex = letterToColumn(transactionColumn);
    const transactionRows: number[] = [];

    // Find all non-empty cells in the transaction column
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (row && colIndex < row.length && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
        transactionRows.push(rowIndex);
      }
    }

    if (transactionRows.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found',
        data: null,
      };
      return c.json(response, 404);
    }

    // Get all transactions in reverse order (most recent first)
    const allRows = transactionRows.slice().reverse();
    const transactions = allRows
      .map(rowIndex => {
        const row = rows[rowIndex];
        if (!row) {
          return null;
        }
        const dateValue = row[colIndex];
        // Check if date is a number
        if (dateValue === null || dateValue === undefined || isNaN(Number(dateValue))) {
          return null;
        }
        // Generate cell address for the date cell (e.g., "C5")
        const cellAddress = `${transactionColumn}${rowIndex + 1}`;
        return {
          cellAddress,
          date: dateValue,
          note: row[colIndex + 1] || '',
          price: row[colIndex + 2] || 0,
          isCashed: row[colIndex + 3] === 'x'
        };
      })
      .filter(transaction => transaction !== null);

    // Calculate total sum of all prices
    const total = transactions.reduce((sum, transaction) => {
      const price = typeof transaction.price === 'number' ? transaction.price : parseFloat(String(transaction.price)) || 0;
      return sum + price;
    }, 0);

    const res: GenericResponseInterface = {
      success: true,
      message: 'All transactions retrieved successfully',
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
        ? `Error while retrieving all transactions: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving all transactions",
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