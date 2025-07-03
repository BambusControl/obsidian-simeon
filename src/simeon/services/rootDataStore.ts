
export interface RootDataStore {
    isInitialized(): Promise<boolean>;
    setInitialized(value: boolean): Promise<void>
    isCurrentVersion(): Promise<boolean>;
}
