/**
 * Information-theoretic primitives. Classical only, by design.
 *
 * Three questions, kept distinct because they answer different things:
 *
 *   relative-entropy    how far has this distribution moved from a baseline?
 *   renyi               which PART of the distribution moved — tail or mode?
 *   equation-of-state   is this distribution poised, with no baseline at all?
 *
 * Each file states, in its header, exactly where the boundary sits between what
 * is implemented here and the quantum-field-theoretic objects some of these share
 * a name with. That boundary is load-bearing: see `relative-entropy.ts`.
 */
export * from "./relative-entropy.js";
export * from "./renyi.js";
export * from "./equation-of-state.js";
