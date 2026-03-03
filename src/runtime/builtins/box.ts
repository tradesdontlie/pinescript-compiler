export interface BoxObject {
  id: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  xloc: string;
  extend: string;
  bgcolor: string;
  border_color: string;
  border_width: number;
  border_style: string;
  text: string;
  text_color: string;
  text_size: string;
  text_halign: string;
  text_valign: string;
  _deleted: boolean;
}

export function createBoxModule() {
  let nextId = 0;
  const boxes: BoxObject[] = [];

  return {
    new(
      left: number,
      top: number,
      right: number,
      bottom: number,
      opts?: {
        xloc?: string;
        extend?: string;
        bgcolor?: string;
        border_color?: string;
        border_width?: number;
        border_style?: string;
        text?: string;
        text_color?: string;
        text_size?: string;
        text_halign?: string;
        text_valign?: string;
      }
    ): BoxObject {
      const box: BoxObject = {
        id: nextId++,
        left,
        top,
        right,
        bottom,
        xloc: opts?.xloc ?? 'bar_index',
        extend: opts?.extend ?? 'none',
        bgcolor: opts?.bgcolor ?? '#2962FF33',
        border_color: opts?.border_color ?? '#2962FF',
        border_width: opts?.border_width ?? 1,
        border_style: opts?.border_style ?? 'solid',
        text: opts?.text ?? '',
        text_color: opts?.text_color ?? '#000000',
        text_size: opts?.text_size ?? 'auto',
        text_halign: opts?.text_halign ?? 'center',
        text_valign: opts?.text_valign ?? 'center',
        _deleted: false,
      };
      boxes.push(box);
      return box;
    },

    delete(box: BoxObject): void {
      box._deleted = true;
    },

    set_left(box: BoxObject, val: number): void {
      box.left = val;
    },

    set_top(box: BoxObject, val: number): void {
      box.top = val;
    },

    set_right(box: BoxObject, val: number): void {
      box.right = val;
    },

    set_bottom(box: BoxObject, val: number): void {
      box.bottom = val;
    },

    set_lefttop(box: BoxObject, left: number, top: number): void {
      box.left = left;
      box.top = top;
    },

    set_rightbottom(box: BoxObject, right: number, bottom: number): void {
      box.right = right;
      box.bottom = bottom;
    },

    set_bgcolor(box: BoxObject, val: string): void {
      box.bgcolor = val;
    },

    set_border_color(box: BoxObject, val: string): void {
      box.border_color = val;
    },

    set_border_width(box: BoxObject, val: number): void {
      box.border_width = val;
    },

    set_border_style(box: BoxObject, val: string): void {
      box.border_style = val;
    },

    set_extend(box: BoxObject, val: string): void {
      box.extend = val;
    },

    set_text(box: BoxObject, val: string): void {
      box.text = val;
    },

    set_text_color(box: BoxObject, val: string): void {
      box.text_color = val;
    },

    set_text_size(box: BoxObject, val: string): void {
      box.text_size = val;
    },

    set_text_halign(box: BoxObject, val: string): void {
      box.text_halign = val;
    },

    set_text_valign(box: BoxObject, val: string): void {
      box.text_valign = val;
    },

    get_left(box: BoxObject): number {
      return box.left;
    },

    get_top(box: BoxObject): number {
      return box.top;
    },

    get_right(box: BoxObject): number {
      return box.right;
    },

    get_bottom(box: BoxObject): number {
      return box.bottom;
    },

    copy(box: BoxObject): BoxObject {
      const copied: BoxObject = {
        id: nextId++,
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        xloc: box.xloc,
        extend: box.extend,
        bgcolor: box.bgcolor,
        border_color: box.border_color,
        border_width: box.border_width,
        border_style: box.border_style,
        text: box.text,
        text_color: box.text_color,
        text_size: box.text_size,
        text_halign: box.text_halign,
        text_valign: box.text_valign,
        _deleted: false,
      };
      boxes.push(copied);
      return copied;
    },

    get all(): BoxObject[] {
      return boxes.filter((b) => !b._deleted);
    },
  };
}
