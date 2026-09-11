import { it, expect, afterEach } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  cp,
  symlink,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  importConnectome,
  sha256File,
  type ImportManifest,
} from "../tools/import-core";
const dirs: string[] = [];
async function setup() {
  await mkdir(".cache/import-tests", { recursive: true });
  const dir = await mkdtemp(resolve(".cache/import-tests/case-"));
  dirs.push(dir);
  await cp("data/schema-fixture", dir, { recursive: true });
  return {
    dir,
    m: JSON.parse(
      await readFile(join(dir, "source.json"), "utf8"),
    ) as ImportManifest,
  };
}
async function save(dir: string, m: ImportManifest) {
  await writeFile(join(dir, "source.json"), JSON.stringify(m));
  return importConnectome(join(dir, "source.json"), join(dir, "output"), {
    commit: "test",
    dirty: false,
  });
}
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
it("checksum-first import preserves uint64 IDs, raw counts and duplicate aggregation", async () => {
  const { dir, m } = await setup(),
    r = await save(dir, m);
  expect(r.totals).toEqual({
    neurons: 3,
    sourceRows: 3,
    uniqueEdges: 2,
    rawSynapses: "12",
  });
  expect(r.simulationReady).toBe(false);
  expect(await sha256File(join(dir, "output", r.metadata.path))).toBe(
    r.metadata.sha256,
  );
  const ids = JSON.parse(
    await readFile(join(dir, "output/neurons.json"), "utf8"),
  );
  expect(ids[0].body).toBe("9007199254740993");
  const raw = await readFile(join(dir, "output/rawCounts.bin"));
  expect(raw.readBigUInt64LE(0)).toBe(5n);
  expect(raw.readBigUInt64LE(8)).toBe(7n);
  for (const [name, file] of Object.entries(r.artifacts))
    expect(await sha256File(join(dir, "output", name + ".bin"))).toBe(
      file.sha256,
    );
});
it("rejects changed source before parsing or output creation", async () => {
  const { dir, m } = await setup();
  await writeFile(join(dir, "edges.csv"), "broken");
  await expect(save(dir, m)).rejects.toThrow("SHA-256 mismatch before");
});
it.each([
  "transmitter",
  "confidence",
  "id",
  "dangling",
  "unsorted",
  "count",
  "totals",
  "provenance",
  "path",
])("rejects invalid %s", async (kind) => {
  const { dir, m } = await setup();
  if (kind === "transmitter" || kind === "confidence" || kind === "id") {
    let s = await readFile(join(dir, "neurons.csv"), "utf8");
    s =
      kind === "transmitter"
        ? s.replace("acetylcholine", "glutamate")
        : kind === "confidence"
          ? s.replace("0.95", "0.2")
          : s.replace("9007199254740994", "9007199254740993");
    await writeFile(join(dir, "neurons.csv"), s);
    m.files.neurons.sha256 = await sha256File(join(dir, "neurons.csv"));
  }
  if (["dangling", "unsorted", "count"].includes(kind)) {
    let s = await readFile(join(dir, "edges.csv"), "utf8");
    if (kind === "dangling")
      s = s.replace("9007199254740995", "9999999999999999");
    if (kind === "unsorted") {
      const a = s.trim().split("\n");
      s = [a[0], a[3], a[1], a[2]].join("\n") + "\n";
    }
    if (kind === "count") s = s.replace(",2\n", ",-2\n");
    await writeFile(join(dir, "edges.csv"), s);
    m.files.edges.sha256 = await sha256File(join(dir, "edges.csv"));
  }
  if (kind === "totals") m.expected.rawSynapses = "99";
  if (kind === "provenance") m.attribution = "";
  if (kind === "path") m.files.edges.path = "../escape.csv";
  await expect(save(dir, m)).rejects.toThrow();
});
it("rejects output ancestor escape before recursive mkdir", async () => {
  const { dir } = await setup();
  await symlink("/proc", join(dir, "outside"));
  await expect(
    importConnectome(
      join(dir, "source.json"),
      join(dir, "outside", "neuroterrarium-must-not-create", "output"),
      { commit: "test", dirty: false },
    ),
  ).rejects.toThrow("Output ancestor symlink escapes project");
});
it("rejects symlink breakout and existing outputs", async () => {
  const { dir, m } = await setup();
  await rm(join(dir, "edges.csv"));
  await symlink(
    resolve("data/schema-fixture/edges.csv"),
    join(dir, "edges.csv"),
  );
  await expect(save(dir, m)).rejects.toThrow("symlink");
  const b = await setup();
  await save(b.dir, b.m);
  await expect(save(b.dir, b.m)).rejects.toThrow("Output exists");
});
