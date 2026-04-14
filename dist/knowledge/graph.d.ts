import { KnowledgeNode, KnowledgeEdge, KnowledgeGraph } from '../types';
export declare class KnowledgeGraphService {
    private nodes;
    private edges;
    /**
     * Add a node to the knowledge graph
     */
    addNode(node: KnowledgeNode): void;
    /**
     * Add an edge to the knowledge graph
     */
    addEdge(edge: KnowledgeEdge): void;
    /**
     * Remove a node from the knowledge graph
     */
    removeNode(nodeId: string): void;
    /**
     * Get a node by ID
     */
    getNode(nodeId: string): KnowledgeNode | undefined;
    /**
     * Get all nodes related to a specific node
     */
    getRelatedNodes(nodeId: string): KnowledgeNode[];
    /**
     * Search nodes by keyword in title or content
     */
    searchByKeyword(keyword: string): KnowledgeNode[];
    /**
     * Get graph statistics
     */
    getStats(): KnowledgeGraph['stats'];
    /**
     * Get all nodes
     */
    getAllNodes(): KnowledgeNode[];
    /**
     * Get all edges
     */
    getAllEdges(): KnowledgeEdge[];
    /**
     * Export the full graph
     */
    exportGraph(): KnowledgeGraph;
    /**
     * Import a graph
     */
    importGraph(graph: KnowledgeGraph): void;
}
//# sourceMappingURL=graph.d.ts.map