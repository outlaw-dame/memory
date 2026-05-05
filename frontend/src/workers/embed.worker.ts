/**
 * Embedding Web Worker
 *
 * Generates 384-dimensional sentence embeddings using bge-small-en-v1.5 via
 * @xenova/transformers (ONNX Runtime Web).  Runs entirely off the main thread.
 *
 * The model (~23 MB quantized) is downloaded once and cached automatically by
 * the browser via the Cache API / IndexedDB managed by transformers.js.
 *
 * Protocol:
 *   Request  → { id: number, texts: string[] }
 *   Response → { id: number, embeddings: number[][] }
 *           | { id: number, error: string }
 */
import { pipeline, env, type FeatureExtractionPipelineType, type Tensor } from '@xenova/transformers'

// Use Hugging Face CDN; disable local model path lookup
env.allowLocalModels = false

type EmbedRequest = { id: number; texts: string[] }
type EmbedSuccess = { id: number; embeddings: number[][] }
type EmbedError = { id: number; error: string }

let extractorPromise: Promise<FeatureExtractionPipelineType> | null = null

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
      quantized: true,
    }) as Promise<FeatureExtractionPipelineType>
  }
  return extractorPromise
}

// Kick off model load immediately on worker instantiation so it's warm by the
// time the first embedding request arrives.
getExtractor().catch(err => console.warn('[EmbedWorker] model pre-load failed:', err))

self.addEventListener('message', async (event: MessageEvent<EmbedRequest>) => {
  const { id, texts } = event.data

  try {
    const extractor = await getExtractor()
    const embeddings: number[][] = await Promise.all(
      texts.map(async text => {
        // Mean-pool across token dimension and L2-normalise for cosine similarity
        const out = (await extractor(text, { pooling: 'mean', normalize: true })) as Tensor
        return Array.from(out.data as Float32Array)
      }),
    )
    self.postMessage({ id, embeddings } satisfies EmbedSuccess)
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message } satisfies EmbedError)
  }
})
