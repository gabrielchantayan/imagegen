import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generate_id } from "./db";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");

export const save_image = async (buffer: Buffer, mime_type: string): Promise<string> => {
  await mkdir(IMAGES_DIR, { recursive: true });

  const ext = mime_type.split("/")[1] || "png";
  const filename = `${generate_id()}.${ext}`;
  const file_path = path.join(IMAGES_DIR, filename);

  await writeFile(file_path, buffer);

  return `/images/${filename}`;
};
