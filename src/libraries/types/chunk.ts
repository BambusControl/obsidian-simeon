export interface Chunk<T> {
    chunkNo: number;
    start: number;
    end: number;
    overlap: number;
    content: T;
}
