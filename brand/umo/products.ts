import type { BrandProduct } from '@/brand'

/** UMO's products are its models, the first the default wherever one is chosen; their pages on umo.auto are a QR's default */
export const PRODUCTS: BrandProduct[] = [
  { id: 'umo5', name: 'UMO 5', page: 'https://umo.auto/umo5' },
  { id: 'umo8', name: 'UMO 8', page: 'https://umo.auto/umo8' },
]
