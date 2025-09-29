import type {ContentRange} from "./contentRange";

export interface SearchResult {
    filepath: string;
    chunkId: number
    score: number;
    content: string
    match: ContentRange;
    highlight: ContentRange;
}
