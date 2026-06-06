import type { CharacterKind } from './types';

// A simple name -> kind registry. Register kinds at startup, then look them up
// by id when placing characters in the world.
const kinds = new Map<string, CharacterKind>();

export function registerCharacterKind(kind: CharacterKind): void {
  kinds.set(kind.id, kind);
}

export function getCharacterKind(id: string): CharacterKind {
  const kind = kinds.get(id);
  if (!kind) throw new Error(`Unknown character kind: "${id}" (was it registered?)`);
  return kind;
}

export function hasCharacterKind(id: string): boolean {
  return kinds.has(id);
}
