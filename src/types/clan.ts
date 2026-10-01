export interface Person {
  _id: string;
  name: string;
  nickname?: string;
  gender?: "male" | "female" | "other";
  isDeceased: boolean;
  birthDate?: string;
  deathDate?: string;
  photoUrl?: string;
  bio?: string;
  generation?: number;
  isFounder?: boolean;
  parents?: { _id: string; name: string }[];
  spouses?: { _id: string; name: string }[];
  children?: { _id: string; name: string }[];
}

export type FamilyNodeType = "coupleNode" | "singleNode";

export interface CoupleNodeData extends Record<string, unknown> {
  primaryPerson: Person;
  spousePerson: Person;
  generation: number;
  childIds: string[];
  isHighlighted?: boolean;
  isImmediateFamily?: boolean;
  isLineage?: boolean;
  selectedPersonId?: string | null;
  onSelectPerson: (personId: string) => void;
}

export interface SingleNodeData extends Record<string, unknown> {
  person: Person;
  generation: number;
  childIds: string[];
  isHighlighted?: boolean;
  isImmediateFamily?: boolean;
  isLineage?: boolean;
  selectedPersonId?: string | null;
  onSelectPerson: (personId: string) => void;
}

export interface ImmediateFamily {
  person: Person;
  parents: Person[];
  spouses: Person[];
  children: Person[];
  siblings: Person[];
}
