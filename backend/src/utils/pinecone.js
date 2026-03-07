import { Pinecone } from '@pinecone-database/pinecone';
import config from '../config/index.js';

// Validate required environment variables
if (!config.pineconeApiKey) {
  throw new Error('PINECONE_API_KEY is required');
}

// Initialize Pinecone client with API key
const pinecone = new Pinecone({
  apiKey: config.pineconeApiKey
});

// Index configuration
const INDEX_NAME = config.pineconeIndexName || 'document-index';
const INDEX_DIMENSION = 768; // all-mpnet-base-v2 embedding dimension
const INDEX_METRIC = 'cosine';

/**
 * Get or create the document index
 * @returns {Promise<import('@pinecone-database/pinecone').Index>} The Pinecone index
 */
async function getIndex() {
  try {
    // List existing indexes
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(idx => idx.name === INDEX_NAME);

    if (!indexExists) {
      console.log(`Creating Pinecone index: ${INDEX_NAME}`);
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: INDEX_DIMENSION,
        metric: INDEX_METRIC,
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log(`Index ${INDEX_NAME} created successfully`);
    }

    // Return the index reference
    return pinecone.index(INDEX_NAME);
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw error;
  }
}

// Create a lazy-loaded index reference
let _pineconeIndex = null;

/**
 * Get the pinecone index (lazy initialization)
 * @returns {Promise<import('@pinecone-database/pinecone').Index>}
 */
async function getPineconeIndex() {
  if (!_pineconeIndex) {
    _pineconeIndex = await getIndex();
  }
  return _pineconeIndex;
}

// Create a proxy object for pineconeIndex that lazily initializes
const pineconeIndex = {
  async upsert(vectors) {
    const index = await getPineconeIndex();
    return index.upsert(vectors);
  },
  async query(params) {
    const index = await getPineconeIndex();
    return index.query(params);
  }
};

// Export the Pinecone client and helper function
export { pinecone, getIndex, pineconeIndex, INDEX_NAME, INDEX_DIMENSION, INDEX_METRIC };
export default pinecone;
