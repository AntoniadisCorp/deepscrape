"""graphify path: trace connection between AuthService and device-verification.service"""
import json
import networkx as nx
from networkx.readwrite import json_graph
from pathlib import Path

data = json.loads(Path("graphify-out/graph.json").read_text())
G = json_graph.node_link_graph(data, edges="links")

a_term = "authservice"
b_term = "device-verification.service"

def find_node(term):
    term = term.lower()
    scored = sorted(
        [(sum(1 for w in term.split() if w in G.nodes[n].get("label", "").lower()), n)
         for n in G.nodes()],
        reverse=True
    )
    return scored[0][1] if scored and scored[0][0] > 0 else None

src = find_node(a_term)
tgt = find_node(b_term)

print(f"Source: {a_term} -> {G.nodes[src].get('label', src) if src else 'NOT FOUND'}")
print(f"Target: {b_term} -> {G.nodes[tgt].get('label', tgt) if tgt else 'NOT FOUND'}")

if src and tgt:
    try:
        path = nx.shortest_path(G, src, tgt)
        print(f"\nShortest path ({len(path)-1} hops):")
        for i, nid in enumerate(path):
            label = G.nodes[nid].get("label", nid)
            src_file = G.nodes[nid].get("source_file", "")
            ftype = G.nodes[nid].get("file_type", "")
            if i < len(path) - 1:
                raw = G[nid][path[i+1]]
                edge = next(iter(raw.values()), {}) if isinstance(raw, dict) and any(isinstance(v, dict) for v in raw.values()) else raw
                rel = edge.get("relation", "") if isinstance(edge, dict) else ""
                conf = edge.get("confidence", "") if isinstance(edge, dict) else ""
                print(f"  {i}. {label}  ({ftype}) [{src_file}]")
                print(f"     --{rel}--> [{conf}]")
            else:
                print(f"  {i}. {label}  ({ftype}) [{src_file}]")
    except nx.NetworkXNoPath:
        print("No path found between nodes!")
    except Exception as e:
        print(f"Error: {e}")
