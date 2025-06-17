
// src/app/models/sheets-api.types.ts
export interface SheetsApiResponse {
  result: {
    values?: any[][]; // For get operations
    updates?: {
      spreadsheetId: string;
      updatedRange: string;
      updatedRows: number;
      updatedColumns: number;
      updatedCells: number;
    }; // For append/update operations
  };
}