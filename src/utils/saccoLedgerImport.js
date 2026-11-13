import * as XLSX from 'xlsx'

// Converts the supplied workbook into the API's safe, sheet-labelled records.
// Unknown columns remain in `row` so Portfolio can expose them without guessing.
export async function parseSaccoLedgerWorkbook(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const records = []
  workbook.SheetNames.forEach((sheet) => {
    XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' }).forEach((row) => records.push({ sheet, row }))
  })
  return { sourceFile: file.name, sheets: workbook.SheetNames, records }
}
