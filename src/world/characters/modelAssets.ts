// Auto-discovers every .glb in /assets/models at build time, keyed by filename
// without the extension. Drop "passenger.glb" into that folder and it becomes
// available as the character kind id "passenger" — no code change required.
//
// import.meta.glob is a Vite feature: it statically finds matching files and
// (with query '?url') gives each a hashed, deployable URL.
const files = import.meta.glob('../../../assets/models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const MODEL_URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace(/\.glb$/i, '');
  MODEL_URLS[name] = url;
}
