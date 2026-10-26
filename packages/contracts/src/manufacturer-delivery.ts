import { z } from "zod";
export const duravitSource = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (["pro.duravit.de", "www.duravit.de", "duravit.de"].includes(
        url.hostname,
      ) ||
        (url.hostname === "www.duravit.com" &&
          url.pathname.startsWith("/de-de/")))
    );
  } catch {
    return false;
  }
};
export const manufacturerDeliverySchema = z.strictObject({
  source_document_version_id: z.uuid(),
  source_url: z
    .string()
    .url()
    .refine(duravitSource, "Eine offizielle deutsche Duravit-Quelle angeben."),
  label: z.string().trim().min(2).max(160),
  unit: z.enum(["mm", "cm", "m"]),
  mapping: z.strictObject({
    article: z.string().min(1).max(150),
    name: z.string().min(1).max(150),
    width: z.string().max(150),
    depth: z.string().max(150),
    height: z.string().max(150),
  }),
});
export type ManufacturerDeliveryInput = z.infer<
  typeof manufacturerDeliverySchema
>;
export type ManufacturerDeliveryRow = {
  article: string;
  name: string;
  width: string | null;
  depth: string | null;
  height: string | null;
  row: number;
};
