"""graphify explain: security/auth/MFA architecture nodes"""
import json
from networkx.readwrite import json_graph
import networkx as nx
from pathlib import Path

data = json.loads(Path("graphify-out/graph.json").read_text())
G = json_graph.node_link_graph(data, edges="links")

# Key terms to search
key_terms = ["auth", "security", "mfa", "verification", "device", "session", "firebase"]

for term in key_terms:
    scored = sorted(
        [(sum(1 for w in term.split() if w in G.nodes[n].get("label", "").lower()), n)
         for n in G.nodes()],
        reverse=True
    )
    top = [(s, n) for s, n in scored if s > 0][:3]
    if top:
        print(f"\n=== '{term}' top nodes ===")
        for s, nid in top:
            d = G.nodes[nid]
            print(f"  {d.get('label', nid)} (deg={G.degree(nid)}) [src={d.get('source_file', '')}]")
            # Get neighbors
            for neighbor in list(G.neighbors(nid))[:5]:
                raw = G[nid][neighbor]
                if isinstance(raw, dict):
                    edge = next(iter(raw.values()), {}) if any(isinstance(v, dict) for v in raw.values()) else raw
                    if isinstance(edge, dict):
                        rel = edge.get("relation", "")
                        conf = edge.get("confidence", "")
                    else:
                        rel = str(edge)
                        conf = ""
                else:
                    rel = str(raw)
                    conf = ""
                nlabel = G.nodes[neighbor].get("label", neighbor)
                print(f"    --{rel}--> {nlabel} [{conf}]")
