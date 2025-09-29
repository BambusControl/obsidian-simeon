import type {EmbeddingChunk} from "./embeddingChunk";

export interface FileEmbedding {
    filepath: string;
    chunk: EmbeddingChunk
}
