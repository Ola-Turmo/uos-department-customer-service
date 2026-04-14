import type { RoutineVariable } from "./types/routine.js";
export declare function isValidRoutineVariableName(name: string): boolean;
export declare function extractRoutineVariableNames(template: string | null | undefined): string[];
export declare function syncRoutineVariablesWithTemplate(template: string | null | undefined, existing: RoutineVariable[] | null | undefined): RoutineVariable[];
export declare function stringifyRoutineVariableValue(value: unknown): string;
export declare function interpolateRoutineTemplate(template: string | null | undefined, values: Record<string, unknown> | null | undefined): string | null;
//# sourceMappingURL=routine-variables.d.ts.map