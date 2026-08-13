// Browser-only: joins the rendered 8-second scenes into one MP4 without
// re-encoding, so a 6-minute film merges in seconds.

const CORE_URL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function getFfmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

export async function mergeSegments(
  urls: string[],
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  if (urls.length === 1) {
    const response = await fetch(urls[0]!);
    return response.blob();
  }

  const ffmpeg = await getFfmpeg();
  const names: string[] = [];

  for (let i = 0; i < urls.length; i += 1) {
    const response = await fetch(urls[i]!);
    if (!response.ok) throw new Error(`Couldn't load scene ${i + 1}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const name = `scene-${String(i).padStart(3, "0")}.mp4`;
    await ffmpeg.writeFile(name, bytes);
    names.push(name);
    onProgress?.((i + 1) / (urls.length + 1));
  }

  const list = names.map((name) => `file '${name}'`).join("\n");
  await ffmpeg.writeFile("list.txt", new TextEncoder().encode(list));
  await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "output.mp4"]);

  const data = await ffmpeg.readFile("output.mp4");
  onProgress?.(1);

  // Clean up so repeated merges don't grow the virtual filesystem.
  await Promise.all([...names, "list.txt", "output.mp4"].map((name) => ffmpeg.deleteFile(name).catch(() => {})));

  const bytes = data as Uint8Array;
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: "video/mp4" });
}
