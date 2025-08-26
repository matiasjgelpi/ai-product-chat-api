import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelService {
  private data: any[] = [];

  constructor() {
    // Cargar archivo Excel al iniciar
    this.loadExcel('products.xlsx');
  }

  loadExcel(filePath: string) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Primera hoja
    const sheet = workbook.Sheets[sheetName];
    this.data = XLSX.utils.sheet_to_json(sheet); // Convierte a objetos JS
  }

  getAll() {
    return this.data;
  }

  findBy(field: string, value: any) {
    return this.data.filter(
      (row) => String(row[field]).toLowerCase() === String(value).toLowerCase(),
    );
  }
}
