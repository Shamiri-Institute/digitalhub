/** A person who acted on survey data, as the viewer may see them. A null name shows as "someone", or "you" for the viewer. */
export type ShownPerson = { name: string | null; isViewer: boolean };

export function personWord(person: ShownPerson, { startsSentence = false } = {}) {
  if (person.name === null) {
    if (person.isViewer) return startsSentence ? "You" : "you";
    return startsSentence ? "Someone" : "someone";
  }
  return person.isViewer ? `${person.name} (you)` : person.name;
}
