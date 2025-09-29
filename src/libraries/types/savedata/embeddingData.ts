import {Initializable} from "./initializable";
import {FileEmbeddingBinary} from "../fileEmbeddingBinary";

export interface EmbeddingData extends Initializable {
    embeddings: Array<FileEmbeddingBinary>;
}
