// -----------------------------
// TYPE DEFINITIONS
// -----------------------------
interface SecretBinding {
  get(): Promise<string>;
}

interface Env {
  BINGO_BUCKET: R2Bucket;
}

// -----------------------------
// DEFINING FUNCTIONS (pure logic)
// -----------------------------

// Pad single digit months to two digits
function padMonth(n: number) {
  return n.toString().padStart(2, "0");
}

// Create monthly "outages-YYYY-MM.json" key name
function monthKey(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = padMonth(d.getUTCMonth() + 1);

  return `outages-${yyyy}-${mm}.json`;
}

//Fetch the template JSON from R2 and write an identical copy to the current monthly key
async function buildMonthlyOutageJSON(env: Env) {
  const templateKey = "outages-template.json";
  const templateData = await env.BINGO_BUCKET.get(templateKey);

  if (!templateData) {
    throw new Error(`File not found`);
  }

  const body = await templateData.arrayBuffer();
  const putKey = monthKey(new Date());
  
  await env.BINGO_BUCKET.put(putKey, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });

  return { templateKey, putKey };               // Behavior: return a small result summary to caller.
  // Justification: useful for logging/testing (especially from fetch()) without returning the file.
}

// -----------------------------
// WORKER ENTRYPOINTS (fetch and scheduled)
// -----------------------------

export default {

} satisfies ExportedHandler<Env>;


