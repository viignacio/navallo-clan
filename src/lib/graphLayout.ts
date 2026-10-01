import dagre from "dagre";
import { Edge, Node } from "@xyflow/react";
import { Person, ImmediateFamily, CoupleNodeData, SingleNodeData } from "../types/clan";

export interface BuildGraphParams {
  members: Person[];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  onFocusPerson: (personId: string) => void;
}

export interface ClanGraphResult {
  nodes: Node[];
  edges: Edge[];
  personToNodeMap: Map<string, string>;
}

export function findPersonById(members: Person[], id: string): Person | undefined {
  return members.find((m) => m._id === id);
}

/**
 * Automatically computes dynamic generation numbers and ensures
 * spouses of founders are also recognized as founders.
 */
export function enrichClanMembers(rawMembers: Person[]): Person[] {
  if (rawMembers.length === 0) return [];

  // Clone members
  const memberMap = new Map<string, Person>();
  rawMembers.forEach((m) => {
    memberMap.set(m._id, { ...m, isFounder: Boolean(m.isFounder) });
  });

  // 1. If Person A is founder, their spouse Person B is also marked founder
  rawMembers.forEach((m) => {
    if (m.isFounder) {
      // Find spouses bidirectionally
      const spouses = rawMembers.filter((other) => {
        if (other._id === m._id) return false;
        const direct = (m.spouses || []).some((s) => s._id === other._id);
        const reverse = (other.spouses || []).some((s) => s._id === m._id);
        return direct || reverse;
      });

      spouses.forEach((sp) => {
        const enrichedSpouse = memberMap.get(sp._id);
        if (enrichedSpouse) {
          enrichedSpouse.isFounder = true;
        }
      });
    }
  });

  // 2. Dynamic generation computation (Gen 1 = Founders / root ancestors)
  const genMap = new Map<string, number>();

  // Determine Gen 1: either explicitly marked founders or root nodes without parents
  const founders = Array.from(memberMap.values()).filter((m) => m.isFounder);
  const gen1Members =
    founders.length > 0
      ? founders
      : Array.from(memberMap.values()).filter(
          (m) => !m.parents || m.parents.length === 0
        );

  gen1Members.forEach((m) => genMap.set(m._id, 1));

  // Breadth-First-Search down generations
  let currentGen = 1;
  let hasMore = true;

  while (hasMore && currentGen < 20) {
    hasMore = false;
    const currentGenIds = new Set(
      Array.from(genMap.entries())
        .filter(([_, g]) => g === currentGen)
        .map(([id]) => id)
    );

    // Find children whose parents are in currentGen
    memberMap.forEach((m) => {
      if (!genMap.has(m._id)) {
        const parentIds = (m.parents || []).map((p) => p._id);
        const hasParentInCurrent = parentIds.some((pId) =>
          currentGenIds.has(pId)
        );
        if (hasParentInCurrent) {
          genMap.set(m._id, currentGen + 1);
          hasMore = true;

          // Also set their spouse to the same generation
          (m.spouses || []).forEach((s) => {
            if (!genMap.has(s._id)) {
              genMap.set(s._id, currentGen + 1);
            }
          });
        }
      }
    });

    currentGen++;
  }

  // Any remaining unlinked members get default Gen 1
  memberMap.forEach((m) => {
    if (!genMap.has(m._id)) {
      genMap.set(m._id, 1);
    }
  });

  // Return enriched members
  return Array.from(memberMap.values()).map((m) => ({
    ...m,
    generation: genMap.get(m._id) || 1,
  }));
}

/**
 * Computes immediate family for a person:
 * Parents, Spouses, Children, and Siblings
 */
export function getImmediateFamily(
  personId: string,
  members: Person[]
): ImmediateFamily | null {
  const person = findPersonById(members, personId);
  if (!person) return null;

  // Parents
  const parentIds = new Set((person.parents || []).map((p) => p._id));
  const parents = members.filter((m) => parentIds.has(m._id));

  // Spouses: bidirectional lookup (this person lists them OR they list this person OR they share children)
  const spouses = members.filter((m) => {
    if (m._id === personId) return false;
    const isDirectSpouse = (person.spouses || []).some((s) => s._id === m._id);
    const isReverseSpouse = (m.spouses || []).some((s) => s._id === personId);
    const sharesChild = members.some((child) => {
      const childParents = (child.parents || []).map((p) => p._id);
      return childParents.includes(personId) && childParents.includes(m._id);
    });
    return isDirectSpouse || isReverseSpouse || sharesChild;
  });

  // Children: anyone who has this person as a parent
  const children = members.filter((m) =>
    (m.parents || []).some((p) => p._id === personId)
  );

  // Siblings: anyone who shares at least one parent (and is not self)
  const siblings = members.filter(
    (m) =>
      m._id !== personId &&
      (m.parents || []).some((p) => parentIds.has(p._id))
  );

  return {
    person,
    parents,
    spouses,
    children,
    siblings,
  };
}

/**
 * Traces ancestry lineage path from founders down to the target person
 */
export function getAncestryPath(
  personId: string,
  members: Person[]
): Person[] {
  const path: Person[] = [];
  let current: Person | undefined = findPersonById(members, personId);
  const visited = new Set<string>();

  while (current && !visited.has(current._id)) {
    visited.add(current._id);
    path.unshift(current);
    if (current.parents && current.parents.length > 0) {
      current = findPersonById(members, current.parents[0]._id);
    } else {
      break;
    }
  }

  return path;
}

/**
 * Builds the visual canvas graph (Nodes & Edges) with Dagre layout
 */
export function buildClanGraph({
  members: rawMembers,
  selectedPersonId,
  onSelectPerson,
  onFocusPerson,
}: BuildGraphParams): ClanGraphResult {
  const members = enrichClanMembers(rawMembers);
  const personToNodeMap = new Map<string, string>();
  const processedPersonIds = new Set<string>();

  // Determine immediate family IDs for visual highlighting
  const immediateFamily = selectedPersonId
    ? getImmediateFamily(selectedPersonId, members)
    : null;

  const immediateMemberIds = new Set<string>();
  if (immediateFamily) {
    immediateMemberIds.add(immediateFamily.person._id);
    immediateFamily.parents.forEach((p) => immediateMemberIds.add(p._id));
    immediateFamily.spouses.forEach((s) => immediateMemberIds.add(s._id));
    immediateFamily.children.forEach((c) => immediateMemberIds.add(c._id));
  }

  // Raw temporary node descriptors before Dagre positioning
  interface TempNode {
    id: string;
    type: "coupleNode" | "singleNode";
    generation: number;
    memberIds: string[];
    data: CoupleNodeData | SingleNodeData;
    width: number;
    height: number;
  }

  const tempNodes: TempNode[] = [];

  // Group members into Couples or Singles
  for (const person of members) {
    if (processedPersonIds.has(person._id)) continue;

    // Check for a spouse that exists in the clan dataset (bidirectional & co-parent)
    let spouse: Person | undefined;
    if (person.spouses && person.spouses.length > 0) {
      for (const spRef of person.spouses) {
        if (!processedPersonIds.has(spRef._id)) {
          spouse = findPersonById(members, spRef._id);
          if (spouse) break;
        }
      }
    }

    // Reverse check: did another member list this person as their spouse?
    if (!spouse) {
      spouse = members.find(
        (m) =>
          !processedPersonIds.has(m._id) &&
          m._id !== person._id &&
          (m.spouses || []).some((s) => s._id === person._id)
      );
    }

    // Co-parent check: do they share children together?
    if (!spouse) {
      for (const child of members) {
        const pIds = (child.parents || []).map((p) => p._id);
        if (pIds.includes(person._id) && pIds.length >= 2) {
          const otherParentId = pIds.find((id) => id !== person._id);
          if (otherParentId && !processedPersonIds.has(otherParentId)) {
            spouse = findPersonById(members, otherParentId);
            if (spouse) break;
          }
        }
      }
    }

    const gen = person.generation || (spouse?.generation ?? 1);

    if (spouse) {
      // Create Couple Node
      const nodeId = `couple_${person._id}_${spouse._id}`;
      personToNodeMap.set(person._id, nodeId);
      personToNodeMap.set(spouse._id, nodeId);
      processedPersonIds.add(person._id);
      processedPersonIds.add(spouse._id);

      const isImm =
        immediateMemberIds.has(person._id) ||
        immediateMemberIds.has(spouse._id);
      const isHigh =
        selectedPersonId === person._id || selectedPersonId === spouse._id;

      // Collect children IDs
      const childIds = members
        .filter((m) =>
          (m.parents || []).some(
            (p) => p._id === person._id || p._id === spouse!._id
          )
        )
        .map((m) => m._id);

      tempNodes.push({
        id: nodeId,
        type: "coupleNode",
        generation: gen,
        memberIds: [person._id, spouse._id],
        width: 380,
        height: 190,
        data: {
          primaryPerson: person,
          spousePerson: spouse,
          generation: gen,
          childIds,
          isImmediateFamily: isImm,
          isHighlighted: isHigh,
          selectedPersonId,
          onSelectPerson,
          onFocusPerson,
        },
      });
    } else {
      // Create Single Node
      const nodeId = `single_${person._id}`;
      personToNodeMap.set(person._id, nodeId);
      processedPersonIds.add(person._id);

      const isImm = immediateMemberIds.has(person._id);
      const isHigh = selectedPersonId === person._id;

      const childIds = members
        .filter((m) => (m.parents || []).some((p) => p._id === person._id))
        .map((m) => m._id);

      tempNodes.push({
        id: nodeId,
        type: "singleNode",
        generation: gen,
        memberIds: [person._id],
        width: 250,
        height: 190,
        data: {
          person,
          generation: gen,
          childIds,
          isImmediateFamily: isImm,
          isHighlighted: isHigh,
          selectedPersonId,
          onSelectPerson,
          onFocusPerson,
        },
      });
    }
  }

  // Create Edges from parent nodes to child nodes
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];

  for (const person of members) {
    if (!person.parents || person.parents.length === 0) continue;

    const childNodeId = personToNodeMap.get(person._id);
    if (!childNodeId) continue;

    // Find parent node(s)
    for (const parentRef of person.parents) {
      const parentNodeId = personToNodeMap.get(parentRef._id);
      if (!parentNodeId || parentNodeId === childNodeId) continue;

      const edgeKey = `${parentNodeId}->${childNodeId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);

        const isConnectedToSelected =
          Boolean(selectedPersonId) &&
          ((immediateMemberIds.has(person._id) &&
            immediateMemberIds.has(parentRef._id)) ||
            person._id === selectedPersonId ||
            parentRef._id === selectedPersonId);

        edges.push({
          id: edgeKey,
          source: parentNodeId,
          target: childNodeId,
          type: "smoothstep",
          animated: isConnectedToSelected,
          style: {
            stroke: isConnectedToSelected ? "#E5C07B" : "rgba(226, 217, 200, 0.25)",
            strokeWidth: isConnectedToSelected ? 2.5 : 1.5,
          },
        });
      }
    }
  }

  // Initialize Dagre Graph for hierarchy layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 80,
    ranksep: 120,
    marginx: 80,
    marginy: 80,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of tempNodes) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Map Dagre coordinates to React Flow Nodes
  const nodes: Node[] = tempNodes.map((tNode) => {
    const dagreNode = g.node(tNode.id);
    return {
      id: tNode.id,
      type: tNode.type,
      position: {
        x: dagreNode.x - tNode.width / 2,
        y: dagreNode.y - tNode.height / 2,
      },
      data: tNode.data,
    };
  });

  return { nodes, edges, personToNodeMap };
}
