import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportSummary = {
  ventasBrutas: number;
  inversion: number;
  gananciaBruta: number;
  gastosTotales: number;
  gananciaNeta: number;
  limiteTercio: number;
  cumplimiento: string;
};

export type ExportEmpleadoRow = {
  colaborador: string;
  puesto: string;
  area: string;
  sucursal?: string;
  ventaIndividual: number;
  salarioBase: number;
  porcentajeComision: number;
  comisionGanada: number;
  bonoMeta?: number;
  retencionIgss?: number;
  liquidoPagar?: number;
  porcentajeMeta?: number;
  totalDevengado: number;
};

export type ExportGastoRow = {
  fecha: string;
  categoria: string;
  descripcion: string;
  tipo: 'Local' | 'Corporativo';
  monto: number;
};

export type ExportVentaRow = {
  fechaInicio: string;
  fechaFin: string;
  tipoPeriodo: string;
  sucursal: string;
  monto: number;
  notas?: string;
};

export type ExportConciliacionRow = {
  sucursal: string;
  periodo: string;
  totalRecaudado: number;
  totalDepositado: number;
  diferencia: number;
  detalle: Array<{ banco: string; noBoleta: string }>;
};

export type ExportReporteData = {
  fechaInicio: string;
  fechaFin: string;
  rangoTexto: string;
  sucursal: string;
  resumen: ExportSummary;
  nomina: ExportEmpleadoRow[];
  gastos: ExportGastoRow[];
  ventas?: ExportVentaRow[];
  conciliacion?: ExportConciliacionRow[];
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | undefined): string => {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getCurrentDateStamp = (): string => new Date().toISOString().slice(0, 10);

const applyBlueHeaderStyle = (sheet: XLSX.WorkSheet, rowIndex: number, colStart: number, colEnd: number) => {
  for (let colIndex = colStart; colIndex <= colEnd; colIndex += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    const cell = sheet[cellRef];
    if (!cell) continue;

    cell.s = {
      fill: { fgColor: { rgb: '1D4ED8' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'BFDBFE' } },
        bottom: { style: 'thin', color: { rgb: 'BFDBFE' } },
        left: { style: 'thin', color: { rgb: 'BFDBFE' } },
        right: { style: 'thin', color: { rgb: 'BFDBFE' } },
      },
    };
  }
};

const buildResumenSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const summaryRows = [
    ['Reporte Financiero', 'Farmacias ERP'],
    ['Rango analizado', data.rangoTexto],
    ['Periodo', `${data.fechaInicio} - ${data.fechaFin}`],
    ['Sucursal', data.sucursal],
    ['Ventas Brutas', formatCurrency(data.resumen.ventasBrutas)],
    ['Inversión', formatCurrency(data.resumen.inversion)],
    ['Margen Bruto', formatCurrency(data.resumen.gananciaBruta)],
    ['Gastos Totales', formatCurrency(data.resumen.gastosTotales)],
    ['Margen Neto', formatCurrency(data.resumen.gananciaNeta)],
    ['Límite del tercio', formatCurrency(data.resumen.limiteTercio)],
    ['Estado', data.resumen.cumplimiento],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(summaryRows);
  applyBlueHeaderStyle(sheet, 0, 0, 1);
  sheet['!cols'] = [{ wch: 30 }, { wch: 24 }];

  return sheet;
};

const buildVentasSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const rows = (data.ventas ?? []).map((venta) => ({
    'Fecha Inicio': formatDate(venta.fechaInicio),
    'Fecha Fin': formatDate(venta.fechaFin),
    'Tipo de Corte': venta.tipoPeriodo,
    Sucursal: venta.sucursal,
    Monto: formatCurrency(venta.monto),
    Notas: venta.notas ?? 'Sin notas',
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Fecha Inicio', 'Fecha Fin', 'Tipo de Corte', 'Sucursal', 'Monto', 'Notas'],
  });
  if (rows.length > 0) {
    applyBlueHeaderStyle(sheet, 0, 0, 5);
  }
  sheet['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 40 }];

  return sheet;
};

const buildGastosSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const rows = data.gastos.map((gasto) => ({
    Fecha: formatDate(gasto.fecha),
    Categoría: gasto.categoria,
    Descripción: gasto.descripcion,
    Tipo: gasto.tipo,
    Monto: formatCurrency(gasto.monto),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Fecha', 'Categoría', 'Descripción', 'Tipo', 'Monto'],
  });
  if (rows.length > 0) {
    applyBlueHeaderStyle(sheet, 0, 0, 4);
  }
  sheet['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 36 }, { wch: 16 }, { wch: 18 }];

  return sheet;
};

const buildNominaSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const rows = data.nomina.map((row) => ({
    Colaborador: row.colaborador,
    Sucursal: row.sucursal ?? 'Sin sucursal',
    Puesto: row.puesto,
    Área: row.area,
    'Venta Registrada': formatCurrency(row.ventaIndividual),
    'Salario Base': formatCurrency(row.salarioBase),
    '% Meta': `${(row.porcentajeMeta ?? 0).toFixed(1)}%`,
    '% Comisión': `${(row.porcentajeComision * 100).toFixed(2)}%`,
    'Comisión Ganada': formatCurrency(row.comisionGanada),
    'Bono Meta': formatCurrency(row.bonoMeta ?? 0),
    'Retención IGSS': formatCurrency(row.retencionIgss ?? 0),
    'Líquido a Pagar': formatCurrency(row.liquidoPagar ?? row.totalDevengado),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Colaborador', 'Sucursal', 'Puesto', 'Área', 'Venta Registrada', 'Salario Base', '% Meta', '% Comisión', 'Comisión Ganada', 'Bono Meta', 'Retención IGSS', 'Líquido a Pagar'],
  });
  if (rows.length > 0) {
    applyBlueHeaderStyle(sheet, 0, 0, 11);
  }
  sheet['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];

  return sheet;
};

const buildConciliacionSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const rows = (data.conciliacion ?? []).map((row) => ({
    Sucursal: row.sucursal,
    Periodo: row.periodo,
    'Ventas Sistema': formatCurrency(row.totalRecaudado),
    'Depositado Banco': formatCurrency(row.totalDepositado),
    Diferencia: formatCurrency(row.diferencia),
    'Detalle Boletas': row.detalle.map((detalle) => `${detalle.banco} / ${detalle.noBoleta}`).join(' | '),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Sucursal', 'Periodo', 'Ventas Sistema', 'Depositado Banco', 'Diferencia', 'Detalle Boletas'],
  });
  if (rows.length > 0) {
    applyBlueHeaderStyle(sheet, 0, 0, 5);
  }
  sheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 46 }];

  return sheet;
};

export const exportarReporteExcel = (data: ExportReporteData): void => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildResumenSheet(data), 'Resumen Ejecutivo');
  XLSX.utils.book_append_sheet(workbook, buildVentasSheet(data), 'Ventas por Farmacia');
  XLSX.utils.book_append_sheet(workbook, buildGastosSheet(data), 'Gastos Operativos');
  XLSX.utils.book_append_sheet(workbook, buildNominaSheet(data), 'Nómina y Comisiones');
  XLSX.utils.book_append_sheet(workbook, buildConciliacionSheet(data), 'Conciliación Bancaria');

  const filename = `Reporte_Financiero_Farmacias_${getCurrentDateStamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

const addSummaryTable = (doc: jsPDF, rows: [string, string][], startY: number) => {
  autoTable(doc, {
    startY,
    head: [['Indicador', 'Valor']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 246, 255] },
  });
};

export const exportarReportePDF = (data: ExportReporteData): void => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('REPORTE FINANCIERO CORPORATIVO', pageWidth / 2, 16, { align: 'center' });

  doc.setFillColor(249, 115, 22);
  doc.roundedRect(12, 30, pageWidth - 24, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Rango analizado: ${data.rangoTexto} | Sucursal: ${data.sucursal} | Emitido: ${new Date().toLocaleString('es-GT')}`, 18, 41);

  const summaryRows: [string, string][] = [
    ['Ventas Brutas', formatCurrency(data.resumen.ventasBrutas)],
    ['Inversión', formatCurrency(data.resumen.inversion)],
    ['Margen Bruto', formatCurrency(data.resumen.gananciaBruta)],
    ['Gastos Totales', formatCurrency(data.resumen.gastosTotales)],
    ['Margen Neto', formatCurrency(data.resumen.gananciaNeta)],
    ['Límite del tercio', formatCurrency(data.resumen.limiteTercio)],
    ['Diagnóstico', data.resumen.cumplimiento],
  ];

  addSummaryTable(doc, summaryRows, 58);

  const ventasTableY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 58;

  autoTable(doc, {
    startY: ventasTableY + 12,
    head: [['Fecha inicio', 'Fecha fin', 'Tipo', 'Farmacia', 'Monto', 'Notas']],
    body: (data.ventas ?? []).map((venta) => [
      formatDate(venta.fechaInicio),
      formatDate(venta.fechaFin),
      venta.tipoPeriodo,
      venta.sucursal,
      formatCurrency(venta.monto),
      venta.notas ?? 'Sin notas',
    ]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  const ventasLastY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 58;

  autoTable(doc, {
    startY: ventasLastY + 10,
    head: [['Colaborador', 'Sucursal', 'Puesto', 'Área', 'Venta', 'Salario', '% Meta', 'Comisión', 'IGSS', 'Líquido']],
    body: data.nomina.map((row) => [
      row.colaborador,
      row.sucursal ?? 'Sin sucursal',
      row.puesto,
      row.area,
      formatCurrency(row.ventaIndividual),
      formatCurrency(row.salarioBase),
      `${(row.porcentajeMeta ?? 0).toFixed(1)}%`,
      formatCurrency(row.comisionGanada),
      formatCurrency(row.retencionIgss ?? 0),
      formatCurrency(row.liquidoPagar ?? row.totalDevengado),
    ]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
    didDrawPage: (tableData) => {
      const totalNomina = data.nomina.reduce((sum, item) => sum + (item.liquidoPagar ?? item.totalDevengado), 0);
      if (tableData.pageNumber === doc.getNumberOfPages() && tableData.cursor) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Total nómina: ${formatCurrency(totalNomina)}`, pageWidth - 14, tableData.cursor.y + 8, { align: 'right' });
      }
    },
  });

  const nominaLastY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? ventasLastY;

  autoTable(doc, {
    startY: nominaLastY + 8,
    head: [['Categoría', 'Monto']],
    body: [...Object.entries(data.gastos.reduce<Record<string, number>>((acc, gasto) => {
      acc[gasto.categoria] = (acc[gasto.categoria] ?? 0) + gasto.monto;
      return acc;
    }, {})).map(([categoria, monto]) => [categoria, formatCurrency(monto)]), ['Total', formatCurrency(data.resumen.gastosTotales)]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  const conciliacionProduced = (data.conciliacion ?? []).length > 0;
  if (conciliacionProduced) {
    const concY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? nominaLastY;
    autoTable(doc, {
      startY: concY + 10,
      head: [['Sucursal', 'Periodo', 'Ventas', 'Depositado', 'Diferencia']],
      body: (data.conciliacion ?? []).map((row) => [
        row.sucursal,
        row.periodo,
        formatCurrency(row.totalRecaudado),
        formatCurrency(row.totalDepositado),
        formatCurrency(row.diferencia),
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
    });
  }

  doc.save(`Informe_Financiero_Farmacias_${getCurrentDateStamp()}.pdf`);
};
