import dagre from "dagre";
import { Edge, Node } from "@xyflow/react";
import { Person, ImmediateFamily, CoupleNodeData, SingleNodeData } from "../types/clan";

export interface BuildGraphParams {
  members: Person[];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
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
 * Computes dynamic generation numbers (Gen 1 = Founders / root ancestors, Gen 2 = Children, etc.)
 */
export function enrichClanMembers(rawMembers: Person[]): Person[] {
  if (rawMembers.length === 0) return [];

  const memberMap = new Map<string, Person>();
  rawMembers.forEach((m) => {
    memberMap.set(m._id, { ...m, isFounder: Boolean(m.isFounder) });
  });

  // Dynamic generation computation (Gen 1 = Founders / root ancestors)
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

  // Spouses: direct lookup from normalized spouses array
  const spouseIds = new Set((person.spouses || []).map((s) => s._id));
  const spouses = members.filter((m) => spouseIds.has(m._id));

  // Children: strictly anyone who has this person as a parent,
  // or who is listed in this person's children references
  const directChildIds = new Set((person.children || []).map((c) => c._id));
  const children = members.filter(
    (m) =>
      directChildIds.has(m._id) ||
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
 * Traces the complete lineage (ancestor bloodline path to founders + all descendants)
 * for a member or couple.
 */
export function getLineageMemberIds(
  personId: string,
  members: Person[]
): Set<string> {
  const lineageMemberIds = new Set<string>();
  const person = findPersonById(members, personId);
  if (!person) return lineageMemberIds;

  // Add person and their spouses
  lineageMemberIds.add(person._id);
  (person.spouses || []).forEach((s) => lineageMemberIds.add(s._id));

  // Determine starting bloodline person (if person married in and has no parents, trace spouse)
  const bloodlinePerson =
    (!person.parents || person.parents.length === 0) &&
    person.spouses &&
    person.spouses.length > 0 &&
    person.spouses.some((s) => {
      const sp = findPersonById(members, s._id);
      return sp?.parents && sp.parents.length > 0;
    })
      ? findPersonById(members, person.spouses[0]._id) || person
      : person;

  // Trace UP to founders (Ancestors)
  const ancestryQueue: Person[] = [bloodlinePerson];
  const visitedAncestors = new Set<string>();

  while (ancestryQueue.length > 0) {
    const current = ancestryQueue.shift()!;
    if (visitedAncestors.has(current._id)) continue;
    visitedAncestors.add(current._id);

    lineageMemberIds.add(current._id);
    (current.spouses || []).forEach((s) => lineageMemberIds.add(s._id));

    // Add parents to queue
    (current.parents || []).forEach((pRef) => {
      const parent = findPersonById(members, pRef._id);
      if (parent) {
        ancestryQueue.push(parent);
      }
    });
  }

  // Trace DOWN to all descendants (children, grandchildren, great-grandchildren)
  const descendantParentQueue: string[] = [person._id];
  const visitedDescendants = new Set<string>(descendantParentQueue);

  while (descendantParentQueue.length > 0) {
    const parentId = descendantParentQueue.shift()!;
    const parentPerson = findPersonById(members, parentId);
    const directChildIds = new Set((parentPerson?.children || []).map((c) => c._id));

    members.forEach((m) => {
      const isChild =
        directChildIds.has(m._id) ||
        (m.parents || []).some((p) => p._id === parentId);

      if (isChild && !visitedDescendants.has(m._id)) {
        visitedDescendants.add(m._id);
        lineageMemberIds.add(m._id);
        descendantParentQueue.push(m._id);

        // Include spouses of descendants so couples stay together
        (m.spouses || []).forEach((s) => {
          lineageMemberIds.add(s._id);
          visitedDescendants.add(s._id);
          descendantParentQueue.push(s._id);
        });
      }
    });
  }

  return lineageMemberIds;
}

/**
 * Builds the visual canvas graph (Nodes & Edges) with Dagre layout
 */
export function buildClanGraph({
  members: rawMembers,
  selectedPersonId,
  onSelectPerson,
}: BuildGraphParams): ClanGraphResult {
  const members = enrichClanMembers(rawMembers);
  const personToNodeMap = new Map<string, string>();
  const processedPersonIds = new Set<string>();

  // Determine immediate family IDs & entire lineage IDs for visual highlighting
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

  const lineageMemberIds = selectedPersonId
    ? getLineageMemberIds(selectedPersonId, members)
    : new Set<string>();

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

    // Check for a spouse that exists in the clan dataset
    let spouse: Person | undefined;
    if (person.spouses && person.spouses.length > 0) {
      for (const spRef of person.spouses) {
        if (!processedPersonIds.has(spRef._id)) {
          spouse = findPersonById(members, spRef._id);
          if (spouse) break;
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

      const isLineage =
        lineageMemberIds.has(person._id) ||
        lineageMemberIds.has(spouse._id);
      const isImm =
        immediateMemberIds.has(person._id) ||
        immediateMemberIds.has(spouse._id);
      const isHigh =
        selectedPersonId === person._id || selectedPersonId === spouse._id;

      // Collect children IDs
      const coupleParentIds = new Set([person._id, spouse._id]);
      const coupleChildRefs = new Set([
        ...(person.children || []).map((c) => c._id),
        ...(spouse.children || []).map((c) => c._id),
      ]);
      const childIds = members
        .filter((m) =>
          coupleChildRefs.has(m._id) ||
          (m.parents || []).some((p) => coupleParentIds.has(p._id))
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
          isLineage,
          isHighlighted: isHigh,
          selectedPersonId,
          onSelectPerson,
        },
      });
    } else {
      // Create Single Node
      const nodeId = `single_${person._id}`;
      personToNodeMap.set(person._id, nodeId);
      processedPersonIds.add(person._id);

      const isLineage = lineageMemberIds.has(person._id);
      const isImm = immediateMemberIds.has(person._id);
      const isHigh = selectedPersonId === person._id;

      const singleChildRefs = new Set((person.children || []).map((c) => c._id));
      const childIds = members
        .filter((m) =>
          singleChildRefs.has(m._id) ||
          (m.parents || []).some((p) => p._id === person._id)
        )
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
          isLineage,
          isHighlighted: isHigh,
          selectedPersonId,
          onSelectPerson,
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

    // Group this child's parents by their parentNodeId
    const nodeToParents = new Map<string, string[]>();
    for (const parentRef of person.parents) {
      const parentNodeId = personToNodeMap.get(parentRef._id);
      if (!parentNodeId || parentNodeId === childNodeId) continue;
      if (!nodeToParents.has(parentNodeId)) {
        nodeToParents.set(parentNodeId, []);
      }
      nodeToParents.get(parentNodeId)!.push(parentRef._id);
    }

    for (const [parentNodeId, parentIds] of nodeToParents.entries()) {
      const isCouple = parentNodeId.startsWith("couple_");

      let sourceHandle: string | undefined = undefined;
      let edgeKey = `${parentNodeId}->${childNodeId}`;

      if (isCouple) {
        if (parentIds.length >= 2) {
          sourceHandle = "couple-joint";
        } else {
          sourceHandle = `parent-${parentIds[0]}`;
          edgeKey = `${parentNodeId}:${parentIds[0]}->${childNodeId}`;
        }
      } else {
        sourceHandle = "single-source";
      }

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);

        const isParentLineage = parentIds.some((pId) => lineageMemberIds.has(pId));
        const isChildLineage = lineageMemberIds.has(person._id);
        const isLineageEdge =
          Boolean(selectedPersonId) && isParentLineage && isChildLineage;

        edges.push({
          id: edgeKey,
          source: parentNodeId,
          target: childNodeId,
          sourceHandle,
          type: "smoothstep",
          animated: isLineageEdge,
          zIndex: isLineageEdge ? 10 : 0,
          style: {
            stroke: isLineageEdge
              ? "#D4AF37"
              : "rgba(226, 217, 200, 0.35)",
            strokeWidth: isLineageEdge ? 3 : 1.5,
            opacity: isLineageEdge ? 1 : 0.7,
          },
        });
      }
    }
  }

  // Initialize Dagre Graph for hierarchy layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 100,
    ranksep: 150,
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
