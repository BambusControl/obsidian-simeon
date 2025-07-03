import {RootDataStore} from "../rootDataStore";
import {DataInitializer} from "../dataInitializer";

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

}
