import { renderDocumentUrlToPdf } from '@/utils/pdf/playwright-renderer'

// Deprecated for runtime report downloads; retained for CLI/static PDF tooling.
export async function renderUrlToPdfBuffer(routeUrl: string) {
  return renderDocumentUrlToPdf({ url: routeUrl })
}
