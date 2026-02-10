import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { FieldValues } from "react-hook-form";
import type { z } from "zod";

/**
 * Typed wrapper around @hookform/resolvers zodResolver.
 * Workaround for Zod v4 + @hookform/resolvers type mismatch (see
 * https://github.com/react-hook-form/resolvers/issues/813).
 * Fixes resolver being typed with schema input (e.g. unknown for z.coerce
 * fields) so useForm<z.infer<Schema>> receives Resolver<output>.
 */
type ResolverOutput<T extends z.ZodType> =
  z.infer<T> extends FieldValues ? z.infer<T> : FieldValues;

export function zodResolver<T extends z.ZodType>(schema: T): Resolver<ResolverOutput<T>> {
  // Schema cast needed: Zod v4 types don't match resolver's Zod3Type expectations (issue #813)
  return baseZodResolver(schema as never) as unknown as Resolver<ResolverOutput<T>>;
}
