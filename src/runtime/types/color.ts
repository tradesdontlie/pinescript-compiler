export const colorConstants: Record<string, string> = {
  red: '#FF5252',
  green: '#4CAF50',
  blue: '#2962FF',
  orange: '#FF9800',
  purple: '#9C27B0',
  yellow: '#FFEB3B',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#787B86',
  silver: '#B2B5BE',
  maroon: '#880E4F',
  olive: '#808000',
  lime: '#00E676',
  teal: '#00897B',
  navy: '#311B92',
  fuchsia: '#E040FB',
  aqua: '#00BCD4',
};

export function colorNew(baseColor: string, transparency: number): string {
  const alpha = Math.max(0, Math.min(100, transparency));
  const alphaHex = Math.round((1 - alpha / 100) * 255).toString(16).padStart(2, '0');
  const hex = colorConstants[baseColor] ?? baseColor;
  return hex + alphaHex;
}

export function rgb(r: number, g: number, b: number, transparency: number = 0): string {
  const alpha = Math.max(0, Math.min(1, 1 - transparency / 100));
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
}

export const color = new Proxy(
  {
    ...colorConstants,
    new: colorNew,
    rgb,
  } as Record<string, unknown>,
  {
    get(target, prop: string) {
      return target[prop];
    },
  }
);
