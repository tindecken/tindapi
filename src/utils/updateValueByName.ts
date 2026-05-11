import getAuthenticatedSheets from './getAuthenticatedSheets';
import { columnToLetter } from './getTransactionColumn';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not defined');
}

/**
 * Update a value in a Google Sheet based on a cell name/label
 * @param sheetName - The name of the sheet/tab to search in
 * @param name - The label/name to search for
 * @param newValue - The new value to set
 * @param isValueBottom - If true, updates value below the found cell; if false, updates value to the right
 * @param spreadsheetId - Optional spreadsheet ID (defaults to env variable)
 */
export async function updateValueByName(
    sheetName: string,
    name: string,
    newValue: any,
    isValueBottom: boolean = false,
    spreadsheetId: string = SPREADSHEET_ID!
): Promise<void> {

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
        if (!row) continue;

        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cellValue = row[colIndex];
            const cellValueStr = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
            const searchNameStr = String(name).trim();

            if (cellValueStr === searchNameStr) {
                // Found the cell with the name
                let updateRow = rowIndex;
                let updateCol = colIndex;

                if (isValueBottom) {
                    updateRow++;
                } else {
                    updateCol++;
                }

                const range = `${sheetName}!${columnToLetter(updateCol)}${updateRow + 1}`;

                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range,
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [[newValue]] },
                });

                console.log(`Updated value for "${name}" at ${range} to ${newValue}`);
                return;
            }
        }
    }

    throw new Error(`Name "${name}" not found in sheet "${sheetName}"`);
}

export default updateValueByName;
