import colors from './colors';

export function canvasFont(canvas: HTMLCanvasElement) {
  return `12px ${getComputedStyle(canvas).fontFamily}`;
}

export function clearCanvas(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = colors.foreground;
  context.strokeStyle = colors.foreground;
  context.lineWidth = 1;
  context.textBaseline = 'alphabetic';
}

export function crisp(value: number) {
  return Math.floor(value) + 0.5;
}
