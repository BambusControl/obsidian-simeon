import type {ContentRange} from "./contentRange";

export interface ContentSplit {
    id: number;
    range: ContentRange;
    content: string;
}
