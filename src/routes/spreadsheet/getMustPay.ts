import { Hono } from "hono";
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import getAuthenticatedSheets from '../../utils/getAuthenticatedSheets';
import { getFirstSheet } from '../../utils/getFirstSheet';

// Initialize Hono router
export const getMustPay = new Hono();

// Define interface for must pay record
interface MustPayRecord {
  cell: string;
  name: string;
  amount: number;
}

// Helper function to convert row and column to cell reference (e.g., 1, 0 -> 'A1')
const getCellReference = (row: number, col: number): string => {
  let column = '';
  while (col >= 0) {
    column = String.fromCharCode(65 + (col % 26)) + column;
    col = Math.floor(col / 26) - 1;
  }
  return `${column}${row}`;
};

getMustPay.get('/getMustPay', async (c) => {
  try {
    // Get spreadsheet ID from environment variable
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID environment variable is not set');
    }

    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();
    
    // Get the first sheet name
    const sheetName = await getFirstSheet(spreadsheetId);
    
    // Get all data from the first sheet, columns A and B
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:B`,
    });

    const rows = response.data.values || [];
    const mustPayRecords: MustPayRecord[] = [];
    const startRow = 6; // 0-based index for row 7 (A7)

    // Process rows starting from row 7 (index 6)
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      // Skip if row doesn't have at least 2 columns or if name is empty
      if (!row || row.length < 2 || !row[0]?.trim()) {
        continue;
      }

      const name = row[0].trim();
      const amount = parseFloat(row[1]) || 0; 

      // Convert 0-based index to 1-based for cell reference
      const cellRef = getCellReference(i + 1, 0); // Column A (0) and current row
      
      mustPayRecords.push({
        cell: cellRef,
        name,
        amount
      });
    }

    const res: GenericResponseInterface = {
      success: true,
      message: 'Retrieved must pay records successfully',
      data: mustPayRecords,
    };
    
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error?.message || 'Error while retrieving must pay records',
      data: null,
    };
    return c.json(response, 500);
  }
});