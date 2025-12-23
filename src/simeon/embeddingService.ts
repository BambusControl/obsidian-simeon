import {AutoTokenizer, PreTrainedTokenizer, AutoModel, PreTrainedModel} from '@huggingface/transformers';


const MODEL_ID = "onnx-community/embeddinggemma-300m-ONNX";
const DTYPE = "q4"; // Options: "fp32" | "q8" | "q4"

const PREFIXES = {
    query: "task: search result | query: ",
    document: "title: none | text: ", // We can add the title here
    questionAnswering: "task: question answering | query: ",
    factVerification: "task: fact checking | query: ",
    classification: "task: classification | query: ",
    clustering: "task: clustering | query: ",
    semanticSimilarity: "task: sentence similarity | query: ",
    codeRetrieval: "task: code retrieval | query: ",
};

// Singleton singletonEmbeddingService
let instance: EmbeddingService | null = null;

export class EmbeddingService {

    private constructor(
        private readonly tokenizer: PreTrainedTokenizer,
        private readonly model: PreTrainedModel,
    ) {
    }

    static async getInstance(progressCallback: (progress: any) => void = () => {}): Promise<EmbeddingService> {

        if (instance !== null) {
            return instance;
        }

        console.log("Init tokenizer")
        const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {progress_callback: progressCallback});
        console.log("Init model")
        const model = await AutoModel.from_pretrained(MODEL_ID, {
            dtype: DTYPE,
            progress_callback: progressCallback,
        });
        console.log("Create service")
        instance = new EmbeddingService(tokenizer, model);
        return instance;
    }

    async localEmbedDocument(title: string | null, text: string): Promise<number[]> {
        if (!this.tokenizer || !this.model) {
            throw new Error("Embedding service is not ready.");
        }

        const prompt = "title: " + (title ?? "none") + " | text: " + text

        const inputs = await this.tokenizer([prompt], {padding: true, truncation: true});
        const {sentence_embedding} = await this.model(inputs);
        const documentEmbeddings = sentence_embedding.tolist() as number[][];
        return documentEmbeddings[0];
    }

    async localEmbedQuery(query: string): Promise<number[]> {
        if (!this.tokenizer || !this.model) {
            throw new Error("Embedding service is not ready.");
        }

        const prompt = "task: search result | query: " + query

        const inputs = await this.tokenizer([prompt], {padding: true, truncation: true});
        const {sentence_embedding} = await this.model(inputs);
        const documentEmbeddings = sentence_embedding.tolist() as number[][];
        return documentEmbeddings[0];
    }

}
