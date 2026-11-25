import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    createSearchIndex,
    scanFiles,
    searchCandidates,
    simpleFolderSearch,
} from "../src/index";

let root: string;
const rel = (files: string[]) => files.map(f => path.relative(root, f).split(path.sep).join("/"));

before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "sfs-test-"));
    const files = [
        "Artist A/my song.mp3",
        "Artist A/Other Track.MP3",
        "Artist A/notes.txt",
        "Artist B/01 - Some Really Long Album Intro Track - My Song (Remastered 2011).mp3",
        "Artist B/Deep/deeper/buried.mp3",
        "Artist B/archive.tar.gz",
        "node_modules/pkg/ignored.mp3",
        ".hidden/secret.mp3",
        "foomp3",
    ];
    for (const file of files) {
        const full = path.join(root, file);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, "");
    }
});

after(() => fs.rmSync(root, { recursive: true, force: true }));

describe("simpleFolderSearch", () => {
    it("finds an exact match first", async () => {
        const results = await simpleFolderSearch(root, [".mp3"], "my song");
        assert.equal(rel(results)[0], "Artist A/my song.mp3");
    });

    it("matches the query anywhere in long file names", async () => {
        const results = rel(await simpleFolderSearch(root, [".mp3"], "my song"));
        assert.ok(results.some(r => r.includes("Remastered 2011")));
    });

    it("matches extensions case-insensitively and requires the dot", async () => {
        const results = rel(await simpleFolderSearch(root, ["mp3"], ""));
        assert.ok(results.includes("Artist A/Other Track.MP3"));
        assert.ok(!results.includes("foomp3"));
    });

    it("supports multi-part extensions", async () => {
        const results = await simpleFolderSearch(root, [".tar.gz"], "archive", { includeScores: true });
        assert.equal(results.length, 1);
        assert.equal(results[0].name, "archive");
    });

    it("accepts a one-element array", async () => {
        const results = rel(await simpleFolderSearch(root, [".mp3"], ["my song"]));
        assert.equal(results[0], "Artist A/my song.mp3");
    });

    it("searches by name and folder", async () => {
        const results = rel(await simpleFolderSearch(root, [".mp3"], ["my song", "Artist B"]));
        assert.ok(results[0].startsWith("Artist B/"));
    });

    it("accepts an object query with the artist alias", async () => {
        const results = rel(await simpleFolderSearch(root, [".mp3"], { artist: "Artist A" }));
        assert.ok(results.length >= 2);
        assert.ok(results.every(r => r.startsWith("Artist A/")));
    });

    it("accepts the options-object form", async () => {
        const results = await simpleFolderSearch({ path: root, extensions: [".mp3"], query: "my song", limit: 1 });
        assert.equal(rel(results)[0], "Artist A/my song.mp3");
        assert.equal(results.length, 1);
    });

    it("returns scores between minimumScore and 1", async () => {
        const results = await simpleFolderSearch(root, [".mp3"], "my song", { includeScores: true, minimumScore: 0.5 });
        assert.ok(results.length > 0);
        for (const r of results) assert.ok(r.score >= 0.5 && r.score <= 1);
        assert.ok(results[0].score >= results[results.length - 1].score);
    });

    it("returns fewer results with a stricter minimumScore", async () => {
        const loose = await simpleFolderSearch(root, [".mp3"], "my sogn", { minimumScore: 0.3 });
        const strict = await simpleFolderSearch(root, [".mp3"], "my sogn", { minimumScore: 0.95 });
        assert.ok(loose.length > 0);
        assert.ok(strict.length < loose.length);
    });

    it("respects limit", async () => {
        assert.equal((await simpleFolderSearch(root, [], "", { limit: 2 })).length, 2);
    });

    it("respects maxDepth", async () => {
        const results = rel(await simpleFolderSearch(root, [".mp3"], "", { maxDepth: 1 }));
        assert.ok(!results.some(r => r.includes("buried")));
        assert.ok(results.includes("Artist A/my song.mp3"));
    });

    it("respects ignore rules and ignoreHidden", async () => {
        const results = rel(await simpleFolderSearch(root, [".mp3"], "", {
            ignore: ["node_modules", /deeper/, (p) => p.endsWith("Other Track.MP3")],
            ignoreHidden: true,
        }));
        assert.ok(!results.some(r => r.includes("node_modules")));
        assert.ok(!results.some(r => r.includes("buried")));
        assert.ok(!results.some(r => r.includes(".hidden")));
        assert.ok(!results.includes("Artist A/Other Track.MP3"));
        assert.ok(results.includes("Artist A/my song.mp3"));
    });

    it("supports path globs in ignore", async () => {
        const results = rel(await simpleFolderSearch(root, [".mp3"], "", { ignore: ["Artist B/**"] }));
        assert.ok(!results.some(r => r.startsWith("Artist B/")));
    });

    it("gives the same results with parallel directory reads", async () => {
        const serial = await simpleFolderSearch(root, [], "", { parallelSearches: 1, batchSize: 1 });
        const parallel = await simpleFolderSearch(root, [], "", { parallelSearches: 8 });
        assert.deepEqual(parallel, serial);
    });

    it("can be aborted", async () => {
        const controller = new AbortController();
        controller.abort(new Error("stop"));
        await assert.rejects(simpleFolderSearch(root, [], "", { signal: controller.signal }), /stop/);
    });

    it("uses the cache callback instead of scanning", async () => {
        const fake = path.join(root, "Cached/cached song.mp3");
        const results = await simpleFolderSearch(root, [".mp3"], "cached song", {}, async () => [fake]);
        assert.deepEqual(results, [fake]);
    });

    it("validates its input", async () => {
        await assert.rejects(simpleFolderSearch(path.join(root, "nope"), [], ""), /does not exist/);
        await assert.rejects(simpleFolderSearch(path.join(root, "Artist A/notes.txt"), [], ""), /not a directory/);
        await assert.rejects(simpleFolderSearch(root, [], "", { minimumScore: NaN }), /Minimum score/);
        await assert.rejects(simpleFolderSearch(root, [], "", { parallelSearches: 0 }), /Parallel searches/);
        await assert.rejects(simpleFolderSearch(root, [], "", { limit: -1 }), /Limit/);
    });
});

describe("scanFiles", () => {
    it("returns sorted absolute paths", async () => {
        const files = await scanFiles(root, [".mp3"]);
        assert.deepEqual(files, [...files].sort());
        assert.ok(files.every(f => path.isAbsolute(f)));
    });

    it("skips unreadable sub-folders and reports them", { skip: process.platform === "win32" }, async () => {
        const locked = path.join(root, "locked");
        fs.mkdirSync(locked);
        fs.chmodSync(locked, 0);
        const errors: string[] = [];
        try {
            await scanFiles(root, [], { onError: (_e, p) => errors.push(p) });
            if (process.getuid?.() !== 0) assert.deepEqual(errors, [locked]);
        } finally {
            fs.chmodSync(locked, 0o755);
            fs.rmdirSync(locked);
        }
    });
});

describe("searchCandidates", () => {
    it("works with the legacy artist field", async () => {
        const results = await searchCandidates(
            [{ name: "my song", artist: "Someone", path: "/a" }, { name: "else", artist: "Other", path: "/b" }],
            ["my song", "Someone"],
            0.6,
        );
        assert.deepEqual(results, ["/a"]);
    });
});

describe("createSearchIndex", () => {
    it("searches without rescanning and picks up changes on refresh", async () => {
        const index = await createSearchIndex(root, [".mp3"], { minimumScore: 0.6 });
        const sizeBefore = index.size;
        assert.equal(rel(index.search("my song"))[0], "Artist A/my song.mp3");

        const added = path.join(root, "Artist C/brand new.mp3");
        fs.mkdirSync(path.dirname(added), { recursive: true });
        fs.writeFileSync(added, "");
        assert.equal(index.search("brand new").length, 0);

        await index.refresh();
        assert.equal(index.size, sizeBefore + 1);
        assert.deepEqual(index.search("brand new", { includeScores: true }).map(r => r.path), [added]);
        fs.rmSync(path.dirname(added), { recursive: true });
    });
});
