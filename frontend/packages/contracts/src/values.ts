/** 与 Excel 一致的错误值编码。 */
export type CellErrorCode =
  | '#DIV/0!'
  | '#VALUE!'
  | '#N/A'
  | '#NAME?'
  | '#NUM!'
  | '#REF!'
  | '#NULL!';

export interface CellErrorValue {
  type: 'error';
  code: CellErrorCode;
  message?: string;
}

/** 插件函数参数/结果使用的统一 tagged value 编码。 */
export type CellValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'empty' }
  | CellErrorValue
  | { type: 'array'; value: CellValue[][] };

export function isCellError(value: CellValue): value is CellErrorValue {
  return value.type === 'error';
}

export function numberValue(value: number): CellValue {
  return { type: 'number', value };
}

export function stringValue(value: string): CellValue {
  return { type: 'string', value };
}
