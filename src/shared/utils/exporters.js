/**
 * exporters.js — Helpers para exportar tablas a Excel (xlsx) y PDF (jspdf-autotable).
 */
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Exporta un array de objetos a .xlsx
 * @param {Array}  rows      - Array de objetos planos
 * @param {string} filename  - Sin extensión
 * @param {string} sheetName
 */
export function exportToExcel(rows, filename, sheetName = 'Datos') {
  const ws  = XLSX.utils.json_to_sheet(rows)
  const wb  = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Exporta columnas + filas a PDF con jspdf-autotable
 * @param {Array}  columns  - [{ header: 'Nombre', dataKey: 'name' }]
 * @param {Array}  rows     - Array de objetos
 * @param {string} title    - Título del documento
 * @param {string} filename - Sin extensión
 */
export function exportToPDF(columns, rows, title, filename) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    columns,
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  doc.save(`${filename}.pdf`)
}
