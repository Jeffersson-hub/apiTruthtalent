export async function fetchToBuffer(url: string): Promise<{ buffer: Buffer; filename: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  const arr = await resp.arrayBuffer();
  const buffer = Buffer.from(arr);
  const filename = url.split("?")[0].split("/").pop() || "cv.bin";
  return { buffer, filename };
}
