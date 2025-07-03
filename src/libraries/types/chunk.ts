export interface Chunk<T> {
    chunkNo: number;
    start: number;
    end: number;
    content: T;
}
