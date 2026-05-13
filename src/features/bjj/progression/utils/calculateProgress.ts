/**

 */
export function calculateProgress(checkedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0
  if (checkedCount < 0) return 0
  const ratio = checkedCount / totalCount
  return Math.round(ratio * 100)
}

/**

 */
export function calculateSectionProgress(
  sectionId: string,
  checkedCount: number,
  totalCount: number
): number {
  // Informational sections always show 100%
  if (sectionId === 'pilares') return 100
  if (totalCount <= 0) return 0
  if (checkedCount < 0) return 0
  const ratio = checkedCount / totalCount
  return Math.round(ratio * 100)
}