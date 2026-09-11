import type { Circuit } from "./circuit";
export const VIEW_BUDGET = { nodes: 64, edges: 120, routes: 32 } as const;
export function summarizeCircuit(c: Circuit) {
  const regions = ["CentralBrain", "VNC", "CV"].map((name) => ({
    name,
    neurons: c.neurons.filter((n) => n.regions.includes(name)).length,
    posts: c.neurons.reduce(
      (s, n) => s + (n.regionContacts[name]?.post ?? 0),
      0,
    ),
  }));
  const byId = new Map(c.neurons.map((n) => [n.id, n]));
  const routes = new Map<
    string,
    { pre: string; post: string; contacts: bigint; pairs: number }
  >();
  for (const e of c.edges) {
    const a = byId.get(e.pre)!,
      b = byId.get(e.post)!,
      key = a.type + ":" + b.type;
    const r = routes.get(key) ?? {
      pre: a.type,
      post: b.type,
      contacts: 0n,
      pairs: 0,
    };
    r.contacts += BigInt(e.contacts);
    r.pairs++;
    routes.set(key, r);
  }
  return {
    regions,
    routes: [...routes.values()].sort((a, b) =>
      a.contacts === b.contacts
        ? (a.pre + ":" + a.post).localeCompare(b.pre + ":" + b.post)
        : a.contacts > b.contacts
          ? -1
          : 1,
    ),
  };
}
export function neuronNeighborhood(c: Circuit, id: string) {
  const edges = c.edges
    .filter((e) => e.pre === id || e.post === id)
    .sort((a, b) =>
      BigInt(a.contacts) > BigInt(b.contacts)
        ? -1
        : BigInt(a.contacts) < BigInt(b.contacts)
          ? 1
          : (a.pre + ":" + a.post).localeCompare(b.pre + ":" + b.post),
    );
  return {
    edges: edges.slice(0, VIEW_BUDGET.edges),
    omitted: Math.max(0, edges.length - VIEW_BUDGET.edges),
  };
}
