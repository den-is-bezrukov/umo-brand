import type { BrandPlateFrame } from '@/plate/frame'

/**
 * 18 mm with −1% tracking, the capitals 2.5 mm under the top of the field: half a millimetre above Figma's 3, as the
 * line is mostly lowercase and Ц's tail, and its weight sat low between the plate and the frame's rounded bottom
 */
export const PLATE_FRAME: BrandPlateFrame = { size: 18, tracking: -0.01, top: 2.5 }
