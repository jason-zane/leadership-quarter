/**
 * Sanitises a user-supplied search string for safe interpolation into PostgREST
 * `.or()` / `.ilike()` filter expressions.
 *
 * PostgREST parses filter values using commas, dots, and parentheses as
 * structural operators.  A crafted query containing these characters could
 * manipulate filter semantics (e.g. injecting additional filter clauses).
 *
 * This function strips characters that have syntactic meaning inside PostgREST
 * filter strings while preserving normal search text.
 */
export function sanitiseSearchQuery(raw: string): string {
  // Remove characters that act as PostgREST filter operators:
  //   ,  — separates filter clauses in .or()
  //   .  — separates column.operator in filter expressions
  //   (  — opens grouped expressions
  //   )  — closes grouped expressions
  //   %  — we add our own wildcard wrapping; strip user-supplied ones
  //   *  — alternative wildcard in some PostgREST contexts
  //   \  — escape character
  return raw.replace(/[,.()*%\\]/g, '').trim()
}
