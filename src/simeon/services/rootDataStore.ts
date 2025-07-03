import {EmbeddingData} from "../../libraries/types/savedata/embeddingData";

export interface RootDataStore {
    isInitialized(): Promise<boolean>;
    setInitialized(value: boolean): Promise<void>
    isCurrentVersion(): Promise<boolean>;

    getEmbeddingData(): Promise<EmbeddingData>
    overwriteEmbeddingData(embeddingData: EmbeddingData): Promise<EmbeddingData>
}
