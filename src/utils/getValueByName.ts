import getAuthenticatedSheets from './getAuthenticatedSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not defined');
}

/**
 * Get a value from a Google Sheet based on a cell name/label
 * @param sheetName - The name of the sheet/tab to search in
 * @param name - The label/name to search for
 * @param isValueBottom - If true, returns value below the found cell; if false, returns value to the right
 * @param spreadsheetId - Optional spreadsheet ID (defaults to env variable)
 * @returns The value from the adjacent cell (right or bottom)
 * @throws Error if name not found or operation fails
 */
export async function getValueByName(
  sheetName: string,
  name: string,
  isValueBottom: boolean = false,
  spreadsheetId: string = SPREADSHEET_ID!
): Promise<string | number | null> {
  
  // Get authenticated sheets instance
  const sheets = await getAuthenticatedSheets();

  // Get all values from the sheet
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}`,
  });

  const rows = result.data.values;
  
  if (!rows || rows.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty or not found`);
  }

  // Search for the name in the sheet
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;  // Skip if row is undefined
    
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = row[colIndex];
      // Convert cell value to string for comparison
      const cellValueStr = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
      const searchNameStr = String(name).trim();
      
      if (cellValueStr === searchNameStr) {
        // Found the cell with the name
        let targetValue: string | number | null = null;
        
        if (isValueBottom) {
          // Get value from the cell below (next row, same column)
          if (rowIndex + 1 < rows.length && rows[rowIndex + 1]) {
            targetValue = rows[rowIndex + 1]![colIndex] ?? null;
          }
        } else {
          // Get value from the cell to the right (same row, next column)
          if (colIndex + 1 < row.length) {
            targetValue = row[colIndex + 1] ?? null;
          }
        }
        
        console.log(`Found "${name}" at row ${rowIndex + 1}, col ${colIndex + 1}. Adjacent value: ${targetValue}`);
        return targetValue;
      }
    }
  }

  // If we reach here, the name was not found
  throw new Error(`Name "${name}" not found in sheet "${sheetName}"`);
}

export default getValueByName;
