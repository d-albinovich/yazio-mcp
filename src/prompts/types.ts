/** A zero-argument guided prompt: static instructional text under a name/title. */
export interface PromptDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly text: string;
}
