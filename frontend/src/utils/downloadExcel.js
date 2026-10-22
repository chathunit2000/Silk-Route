import * as XLSX from "xlsx";

export default function downloadExcel(fileName, sheetName, headers, rows) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!cols"] = headers.map((header, index) => ({
    wch: Math.max(
      String(header).length + 2,
      ...rows.map((row) => String(row[index] ?? "").length + 2)
    ),
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
