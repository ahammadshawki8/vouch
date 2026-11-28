import { Schema, type ObjectSchema } from "firebase/ai";
import { COUNT_CHOICES, YES_NO_CHOICES, type Probe } from "../core/types";

/** Structured output schema for the cloud compiler. Mirrors core/types TestSuite. */
export function suiteSchema(): ObjectSchema {
  const probe = Schema.object({
    properties: {
      id: Schema.string({ description: "Unique probe id, e.g. p1" }),
      kind: Schema.enumString({ enum: ["yesno", "count"] }),
      question: Schema.string({ description: "One short visual question about a single attribute" }),
      pass: Schema.string({ description: "Answer that means the probe passes: yes, no, 0, 1, 2, 3 or 4+" }),
    },
  });
  const test = Schema.object({
    properties: {
      id: Schema.string({ description: "Unique test id, e.g. t1" }),
      type: Schema.enumString({ enum: ["PRESENCE", "COUNT", "ATTRIBUTE", "ABSENCE", "NO_EXTRAS", "ATTESTATION"] }),
      label: Schema.string({ description: "What the seller reads on the checklist, e.g. Green notebook" }),
      item: Schema.string({ description: "Short item name, e.g. notebook" }),
      expectedCount: Schema.integer(),
      attribute: Schema.object({
        properties: { name: Schema.string(), value: Schema.string() },
      }),
      evidence: Schema.string({ description: "The words from the conversation that justify this test" }),
      oracle: Schema.enumString({ enum: ["DEVICE", "CLOUD", "HUMAN"] }),
      referenceSourceIds: Schema.array({
        items: Schema.string(),
        description: "Ids of product photos that show the correct item",
      }),
      mutantSourceIds: Schema.array({
        items: Schema.string(),
        description: "Ids of product photos that show a wrong variant of this item",
      }),
      probes: Schema.array({ items: probe }),
    },
    optionalProperties: ["expectedCount", "attribute", "referenceSourceIds", "mutantSourceIds"],
  });
  return Schema.object({
    properties: {
      summary: Schema.string({ description: "One sentence describing the final order" }),
      changes: Schema.array({
        items: Schema.object({
          properties: { from: Schema.string(), to: Schema.string(), evidence: Schema.string() },
        }),
      }),
      openQuestions: Schema.array({ items: Schema.string() }),
      tests: Schema.array({ items: test }),
    },
  });
}

/** Structured output schema for answering a set of probes on one frame. */
export function answersSchema(probes: Probe[]): ObjectSchema {
  const properties: Record<string, ReturnType<typeof Schema.enumString>> = {};
  for (const p of probes) {
    properties[p.id] = Schema.enumString({
      enum: [...(p.kind === "count" ? COUNT_CHOICES : YES_NO_CHOICES)],
    });
  }
  return Schema.object({ properties });
}
