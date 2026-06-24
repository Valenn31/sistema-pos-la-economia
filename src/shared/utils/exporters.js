/**
 * exporters.js — Helpers para exportar tablas a Excel (xlsx) y PDF (jspdf-autotable).
 */
import XLSX from 'xlsx-js-style'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Exporta un array de objetos a .xlsx con formato profesional.
 * Incluye: encabezado con título y fecha, columnas con ancho auto,
 * header verde con texto blanco, bordes en todas las celdas.
 *
 * @param {Array}  rows      - Array de objetos planos
 * @param {string} filename  - Sin extensión
 * @param {string} sheetName
 */
export function exportToExcel(rows, filename, sheetName = 'Datos') {
  if (!rows.length) return

  const headers = Object.keys(rows[0])

  // Fila de título + fecha
  const titleRow = [sheetName.toUpperCase()]
  const dateRow  = [`Generado: ${new Date().toLocaleString('es-AR')}`]

  // Armar hoja: título → fecha → vacía → headers → datos
  const aoa = [titleRow, dateRow, [], headers, ...rows.map((r) => headers.map((h) => r[h]))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Merge título y fecha a lo ancho de todas las columnas
  const lastCol = headers.length - 1
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ]

  // Ancho automático de columnas basado en el contenido
  ws['!cols'] = headers.map((h, i) => {
    const maxData = rows.reduce((max, r) => Math.max(max, String(r[h] ?? '').length), 0)
    return { wch: Math.max(h.length, maxData, 10) + 3 }
  })

  // Estilos (requiere xlsx con soporte de estilos; sino se ignoran silenciosamente)
  const greenFill = { fgColor: { rgb: '16A34A' } }
  const whiteFont = { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 }
  const titleFont = { bold: true, sz: 14 }
  const dateFont  = { sz: 9, color: { rgb: '666666' } }
  const border = {
    top:    { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left:   { style: 'thin', color: { rgb: 'CCCCCC' } },
    right:  { style: 'thin', color: { rgb: 'CCCCCC' } },
  }

  // Aplicar estilo al título (fila 0)
  const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })]
  if (titleCell) titleCell.s = { font: titleFont }

  // Aplicar estilo a la fecha (fila 1)
  const dateCell = ws[XLSX.utils.encode_cell({ r: 1, c: 0 })]
  if (dateCell) dateCell.s = { font: dateFont }

  // Aplicar estilo a los headers (fila 3)
  headers.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 3, c: ci })
    if (ws[ref]) ws[ref].s = { fill: greenFill, font: whiteFont, border, alignment: { horizontal: 'center' } }
  })

  // Bordes en celdas de datos (fila 4+)
  for (let ri = 4; ri < aoa.length; ri++) {
    headers.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri, c: ci })
      if (ws[ref]) ws[ref].s = { border, alignment: { vertical: 'center' } }
    })
  }

  const wb = XLSX.utils.book_new()
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
