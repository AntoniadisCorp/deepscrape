"""graphify query: find gaps on this architecture and improvements"""
import json
from networkx.readwrite import json_graph
import networkx as nx
from pathlib import Path

data = json.loads(Path("graphify-out/graph.json").read_text())
G = json_graph.node_link_graph(data, edges="links")

question = "find gaps on this architecture and improvements"
terms = [t.lower() for t in question.split() if len(t) > 3]

# Find best-matching start nodes
scored = []
for nid, ndata in G.nodes(data=True):
    label = ndata.get("label", "").lower()
    score = sum(1 for t in terms if t in label)
    if score > 0:
        scored.append((score, nid))
scored.sort(reverse=True)
start_nodes = [nid for _, nid in scored[:5]]

if not start_nodes:
    print("No matching nodes found for terms:", terms)
else:
    print("=== Matched start nodes ===")
    for nid in start_nodes:
        d = G.nodes[nid]
        print(f"  {d.get('label', nid)} [src={d.get('source_file', '')}]")
    print()

    # BFS depth 2
    frontier = set(start_nodes)
    subgraph_nodes = set(start_nodes)
    subgraph_edges = []
    for _ in range(2):
        next_frontier = set()
        for n in frontier:
            for neighbor in G.neighbors(n):
                if neighbor not in subgraph_nodes:
                    next_frontier.add(neighbor)
                    subgraph_edges.append((n, neighbor))
        subgraph_nodes.update(next_frontier)
        frontier = next_frontier

    print(f"Traversal: BFS | {len(subgraph_nodes)} nodes, {len(subgraph_edges)} edges")
    print()

    # Group by source file
    file_groups = {}
    for nid in subgraph_nodes:
        d = G.nodes[nid]
        src = d.get("source_file", "unknown")
        if src not in file_groups:
            file_groups[src] = []
        file_groups[src].append((d.get("label", nid), d.get("file_type", "")))

    for src, items in sorted(file_groups.items()):
        print(f"  [{src}]")
        for lbl, ftype in items[:8]:
            print(f"    {lbl}  ({ftype})")
        if len(items) > 8:
            print(f"    ... +{len(items)-8} more")
        print()
