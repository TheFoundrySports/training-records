import type { WodFormat, WodFormatHandler } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<WodFormat, WodFormatHandler<any>>()

export function registerFormat<T>(handler: WodFormatHandler<T>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry.set(handler.id, handler as WodFormatHandler<any>)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFormat(id: WodFormat): WodFormatHandler<any> {
  const handler = registry.get(id)
  if (!handler) throw new Error(`WodFormatHandler not registered for format: ${id}`)
  return handler
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllFormats(): WodFormatHandler<any>[] {
  return Array.from(registry.values())
}
