import type {Initializable} from "./initializable";
import type {FileEmbeddingBinary} from "../fileEmbeddingBinary";

export interface EmbeddingData extends Initializable {
    embeddings: Array<FileEmbeddingBinary>;
}
