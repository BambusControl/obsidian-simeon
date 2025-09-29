import {getFrontMatterInfo} from "obsidian";
import type {ContentSplit} from "./contentSplit";

//export function* splitIntoChunksMojo(content: string): Generator<Chunk, number, void> {
//    todo
//}

function* splitByFrontMatter(split: ContentSplit): Generator<ContentSplit, number, void> {
    const frontMatter = getFrontMatterInfo(split.content);

    if (frontMatter.exists) {
        yield {
            id: split.id + 1,
            range: {
                from: split.range.from + frontMatter.from,
                to: split.range.from + frontMatter.to
            },
            content: frontMatter.frontmatter
        };
    }

    yield {
        id: split.id + 2,
        range: {
            from: split.range.from + frontMatter.contentStart,
            to: split.range.to,
        },
        content: split.content.slice(frontMatter.contentStart)
    };

    return 2;
}
