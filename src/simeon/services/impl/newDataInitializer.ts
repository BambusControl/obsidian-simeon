import {type RootDataStore} from "../rootDataStore";
import {type DataInitializer} from "../dataInitializer";
import {initializationData} from "../../../libraries/data/initializationData";

export class NewDataInitializer implements DataInitializer {
    constructor(
        private readonly dataStore: RootDataStore,
    ) {
    }

    async initializeData(): Promise<void> {
        console.group("Initializing local data");
        await this.initializeAll();
        console.groupEnd();
    }

    private async initializeAll() {
        if (await this.dataStore.isInitialized()) {
            console.info("Plugin data already initialized");
            return;
        }

        if (!await this.dataStore.isCurrentVersion()) {
            console.log("Plugin and Data version mismatch, reinitializing")
            await this.dataStore.setInitialized(false);
        }

        // Initialize data here

        console.info("Flagging local data as initialized");
        await this.dataStore.setInitialized(true);
    }

    private async initializeEmbeddingData() {
        const embeddingDataInitialized = (await this.dataStore.getEmbeddingData()).initialized;

        if (embeddingDataInitialized) {
            console.info("EmbeddingData data already initialized");
            return;
        }

        console.info("EmbeddingData initialization");

        await this.dataStore.overwriteEmbeddingData({
            ...initializationData().embedding,
            initialized: true,
        });
    }

}
