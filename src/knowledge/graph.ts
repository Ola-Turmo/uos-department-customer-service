import { z } from 'zod';
import {
  KnowledgeNodeSchema,
  KnowledgeEdgeSchema,
  KnowledgeGraphSchema,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNodeType,
} from '../types';

// ============== Knowledge Graph Service ==============

export class KnowledgeGraphService {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: KnowledgeEdge[] = [];

  /**
   * Add a node to the knowledge graph
   */
  addNode(node: KnowledgeNode): void {
    // Validate node with schema
    const parsed = KnowledgeNodeSchema.safeParse(node);
    if (!parsed.success) {
      throw new Error(`Invalid knowledge node: ${parsed.error.message}`);
    }
    this.nodes.set(node.id, parsed.data);
  }

  /**
   * Add an edge to the knowledge graph
   */
  addEdge(edge: KnowledgeEdge): void {
    // Validate edge with schema
    const parsed = KnowledgeEdgeSchema.safeParse(edge);
    if (!parsed.success) {
      throw new Error(`Invalid knowledge edge: ${parsed.error.message}`);
    }

    // Ensure both source and target nodes exist
    if (!this.nodes.has(edge.sourceId)) {
      throw new Error(`Source node ${edge.sourceId} does not exist`);
    }
    if (!this.nodes.has(edge.targetId)) {
      throw new Error(`Target node ${edge.targetId} does not exist`);
    }

    this.edges.push(parsed.data);
  }

  /**
   * Remove a node from the knowledge graph
   */
  removeNode(nodeId: string): void {
    if (!this.nodes.has(nodeId)) {
      return;
    }

    // Remove the node
    this.nodes.delete(nodeId);

    // Remove all edges connected to this node
    this.edges = this.edges.filter(
      (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId
    );
  }

  /**
   * Get a node by ID
   */
  getNode(nodeId: string): KnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes related to a specific node
   */
  getRelatedNodes(nodeId: string): KnowledgeNode[] {
    const relatedIds = new Set<string>();

    // Find all edges where this node is source or target
    for (const edge of this.edges) {
      if (edge.sourceId === nodeId) {
        relatedIds.add(edge.targetId);
      } else if (edge.targetId === nodeId) {
        relatedIds.add(edge.sourceId);
      }
    }

    // Get all related nodes
    const relatedNodes: KnowledgeNode[] = [];
    for (const id of relatedIds) {
      const node = this.nodes.get(id);
      if (node) {
        relatedNodes.push(node);
      }
    }

    return relatedNodes;
  }

  /**
   * Search nodes by keyword in title or content
   */
  searchByKeyword(keyword: string): KnowledgeNode[] {
    const lowerKeyword = keyword.toLowerCase();
    const results: KnowledgeNode[] = [];

    for (const node of this.nodes.values()) {
      if (
        node.title.toLowerCase().includes(lowerKeyword) ||
        node.content.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(node);
      }
    }

    return results;
  }

  /**
   * Get graph statistics
   */
  getStats(): KnowledgeGraph['stats'] {
    let issueCount = 0;
    let resolutionCount = 0;

    for (const node of this.nodes.values()) {
      if (node.type === 'issue') {
        issueCount++;
      } else if (node.type === 'resolution') {
        resolutionCount++;
      }
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      issueCount,
      resolutionCount,
    };
  }

  /**
   * Get all nodes
   */
  getAllNodes(): KnowledgeNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getAllEdges(): KnowledgeEdge[] {
    return [...this.edges];
  }

  /**
   * Export the full graph
   */
  exportGraph(): KnowledgeGraph {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
      stats: this.getStats(),
    };
  }

  /**
   * Import a graph
   */
  importGraph(graph: KnowledgeGraph): void {
    // Validate the graph
    const parsed = KnowledgeGraphSchema.safeParse(graph);
    if (!parsed.success) {
      throw new Error(`Invalid knowledge graph: ${parsed.error.message}`);
    }

    // Clear existing data
    this.nodes.clear();
    this.edges = [];

    // Import nodes
    for (const node of parsed.data.nodes) {
      this.nodes.set(node.id, node);
    }

    // Import edges
    for (const edge of parsed.data.edges) {
      this.edges.push(edge);
    }
  }
}
