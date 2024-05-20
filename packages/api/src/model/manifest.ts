import { z } from "zod";

export const TriggerCmd = z.object({
  type: z.union([z.literal("text"), z.literal("regex")]),
  value: z.string(),
});
export type TriggerCmd = z.infer<typeof TriggerCmd>;

export const UiCmd = z.object({
  main: z.string(),
  devMain: z.string(),
  name: z.string(),
  cmds: TriggerCmd.array(),
});
export type UiCmd = z.infer<typeof UiCmd>;

export const InlineCmd = z.object({
  main: z.string(),
  name: z.string(),
  cmds: TriggerCmd.array(),
});
export type InlineCmd = z.infer<typeof UiCmd>;

export const JarvisExtJson = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  identifier: z.string(),
  icon: z.string().nullable().optional(),
  demoImages: z.array(z.string()),
  uiCmds: UiCmd.array(),
  inlineCmds: InlineCmd.array(),
});
export type JarvisExtJson = z.infer<typeof JarvisExtJson>;

/**
 * Extra fields for JarvisExtJson
 * e.g. path to the extension
 */
export const JarvisExtJsonExtra = JarvisExtJson.merge(
  z.object({
    extPath: z.string(),
    extFolderName: z.string(),
  }),
);
export type JarvisExtJsonExtra = z.infer<typeof JarvisExtJsonExtra>;