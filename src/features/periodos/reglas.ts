/**
 * The period faculty can change only in BORRADOR and while the period has no enabled students
 * (the same rule the backend enforces). Topics live in the career bank, so they do not lock it.
 */
export function facultadBloqueada(enBorrador: boolean, estudiantesHabilitados: number | undefined) {
  return !enBorrador || (estudiantesHabilitados ?? 0) > 0
}
