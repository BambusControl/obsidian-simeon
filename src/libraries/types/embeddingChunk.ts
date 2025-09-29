import type {ContentRange} from "../../simeon/contentRange";

export interface EmbeddingChunk {
    chunkNo: number;
    range: ContentRange;
    content: number[];
}
