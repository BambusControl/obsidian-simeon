<script lang="ts">
    import { SearchComponent } from "obsidian";

    interface Props {
        startCount: number;
    }

    let {
        startCount
    }: Props = $props();

    let count = $state(startCount);

    export function increment() {
        count += 1;
    }
</script>

<div class="number">
    <span>My number is {count}!</span>
</div>

<style>
    .number {
        color: red;
    }
</style>
