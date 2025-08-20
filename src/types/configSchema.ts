// TODO: rename `ghoulsConfigSchema` to `GhoulsConfig`
// TODO: rename `GhoulsConfigZod` to `GhoulsConfig`
// TODO: look into https://zod.dev/error-customization instead of `validateConfigWithZod`

import { z } from "zod";

/**
 * Complete Ghouls configuration schema
 */
export const ghoulsConfigSchema = z.object({
  protectedBranches: z.array(z.string().min(1, "Branch name cannot be empty")).optional(),
});

/**
 * TypeScript types inferred from Zod schemas
 */
export type GhoulsConfigZod = z.infer<typeof ghoulsConfigSchema>;

/**
 * Validate Ghouls configuration using Zod
 */
export function validateConfigWithZod(config: unknown): {
  success: true;
  data: GhoulsConfigZod;
} | {
  success: false;
  errors: string[];
} {
  const result = ghoulsConfigSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    }),
  };
}
