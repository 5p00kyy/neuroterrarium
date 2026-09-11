"""Offline GF-centered selection and bounded query compiler."""

import json
from pathlib import Path

ROOT = Path("data/circuits/gf-v1")


def select(rows):
    if len(rows) >= 257:
        raise ValueError("Partner query may be truncated")
    ids = {"10001", "10010"}
    excluded = []
    for row in rows:
        if row[3] in ("acetylcholine", "gaba"):
            ids.add(row[0])
        else:
            excluded.append({"bodyId": row[0], "nt": row[3], "contacts": row[6]})
    return sorted(ids, key=int), excluded


def main():
    rows = json.loads((ROOT / "evidence/inputs/response.json").read_text())["data"]
    ids, excluded = select(rows)
    literal = "[" + ",".join(ids) + "]"
    queries = {
        "neurons": f"MATCH (n:Neuron) WHERE n.bodyId IN {literal} RETURN toString(n.bodyId) AS bodyId, n.type AS type, n.instance AS instance, n.superclass AS superclass, n.somaSide AS side, n.consensusNt AS nt, n.predictedNt AS predictedNt, n.predictedNtConfidence AS confidence, n.roiInfo AS roiInfo, n.status AS status ORDER BY n.bodyId LIMIT 257",
        "edges": f"MATCH (a:Neuron)-[e:ConnectsTo]->(b:Neuron) WHERE a.bodyId IN {literal} AND b.bodyId IN {literal} RETURN toString(a.bodyId) AS pre, toString(b.bodyId) AS post, toString(e.weight) AS weight ORDER BY a.bodyId, b.bodyId LIMIT 16385",
        "boundary": f"MATCH (a:Neuron)-[e:ConnectsTo]->(b:Segment) WHERE a.bodyId IN {literal} RETURN toString(a.bodyId) AS bodyId, toString(sum(e.weight)) AS outgoingContacts, count(e) AS outgoingPairs LIMIT 257",
    }
    for name, cypher in queries.items():
        Path(".cache/phase3-" + name + "-query.json").write_text(
            json.dumps({"dataset": "male-cns:v1.0", "cypher": cypher})
        )
    selection = {
        "schema": "neuroterrarium-selection/1",
        "anchorType": "DNp01",
        "anchorIds": ["10001", "10010"],
        "minimumAnchorContacts": 100,
        "allowedConsensusNt": ["acetylcholine", "gaba"],
        "ids": ids,
        "excluded": excluded,
        "rationale": "Bilateral giant-fiber descending neurons and every direct upstream neuron with at least 100 contacts to either anchor and an ACh/GABA consensus. Induce every directed edge among retained bodies without an internal weight threshold. A GF-centered input microcircuit, not a complete escape circuit or sensory-to-motor model.",
    }
    (ROOT / "selection.json").write_text(json.dumps(selection, indent=2) + "\n")
    print({"selected": len(ids), "excluded": len(excluded)})


if __name__ == "__main__":
    main()
