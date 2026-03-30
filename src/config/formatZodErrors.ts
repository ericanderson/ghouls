/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatZodErrors(error: import("zod").ZodError): string[] {
  return error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}
