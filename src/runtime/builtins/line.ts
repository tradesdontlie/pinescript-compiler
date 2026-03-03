export interface LineObject {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  xloc: string;
  extend: string;
  color: string;
  style: string;
  width: number;
  _deleted: boolean;
}

export function createLineModule() {
  let nextId = 0;
  const lines: LineObject[] = [];

  return {
    new(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      opts?: {
        xloc?: string;
        extend?: string;
        color?: string;
        style?: string;
        width?: number;
      }
    ): LineObject {
      const line: LineObject = {
        id: nextId++,
        x1,
        y1,
        x2,
        y2,
        xloc: opts?.xloc ?? 'bar_index',
        extend: opts?.extend ?? 'none',
        color: opts?.color ?? '#2962FF',
        style: opts?.style ?? 'solid',
        width: opts?.width ?? 1,
        _deleted: false,
      };
      lines.push(line);
      return line;
    },

    delete(line: LineObject): void {
      line._deleted = true;
    },

    set_x1(line: LineObject, val: number): void {
      line.x1 = val;
    },

    set_y1(line: LineObject, val: number): void {
      line.y1 = val;
    },

    set_x2(line: LineObject, val: number): void {
      line.x2 = val;
    },

    set_y2(line: LineObject, val: number): void {
      line.y2 = val;
    },

    set_xy1(line: LineObject, x: number, y: number): void {
      line.x1 = x;
      line.y1 = y;
    },

    set_xy2(line: LineObject, x: number, y: number): void {
      line.x2 = x;
      line.y2 = y;
    },

    set_xloc(line: LineObject, val: string): void {
      line.xloc = val;
    },

    set_extend(line: LineObject, val: string): void {
      line.extend = val;
    },

    set_color(line: LineObject, val: string): void {
      line.color = val;
    },

    set_style(line: LineObject, val: string): void {
      line.style = val;
    },

    set_width(line: LineObject, val: number): void {
      line.width = val;
    },

    get_x1(line: LineObject): number {
      return line.x1;
    },

    get_y1(line: LineObject): number {
      return line.y1;
    },

    get_x2(line: LineObject): number {
      return line.x2;
    },

    get_y2(line: LineObject): number {
      return line.y2;
    },

    get_price(line: LineObject, x: number): number {
      const dx = line.x2 - line.x1;
      if (dx === 0) {
        return line.y1;
      }
      const t = (x - line.x1) / dx;
      return line.y1 + t * (line.y2 - line.y1);
    },

    copy(line: LineObject): LineObject {
      const copied: LineObject = {
        id: nextId++,
        x1: line.x1,
        y1: line.y1,
        x2: line.x2,
        y2: line.y2,
        xloc: line.xloc,
        extend: line.extend,
        color: line.color,
        style: line.style,
        width: line.width,
        _deleted: false,
      };
      lines.push(copied);
      return copied;
    },

    get all(): LineObject[] {
      return lines.filter((l) => !l._deleted);
    },
  };
}
