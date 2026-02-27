// @sigilnet/coherence/src/attractors/comparison.ts
import { computeAttractor, projectToPolar } from "./index.js";
import { extractGeometricSignature, } from "../superformula.js";
const COMPARISON_MAX_POINTS = 900;
const COMPARISON_FIT = {
    seeds: 3,
    iterations: 12,
    randomSeed: 42,
    lossMode: "huber",
    huberDelta: 0.15,
};
function downsamplePolar(points, maxPoints = COMPARISON_MAX_POINTS) {
    if (points.length <= maxPoints)
        return points;
    const stride = Math.max(1, Math.floor(points.length / maxPoints));
    const sampled = [];
    for (let i = 0; i < points.length; i += stride)
        sampled.push(points[i]);
    return sampled;
}
function buildSignatureForComparison(positions, projection) {
    const polar = downsamplePolar(projectToPolar(positions, projection));
    return extractGeometricSignature(polar, {
        includeSuperformulaFit: true,
        histogramBins: 36,
        harmonics: 12,
        fit: COMPARISON_FIT,
    });
}
/**
 * Pre-computed reference signatures for known attractors
 */
export const REFERENCE_SIGNATURES = (() => {
    const cache = {};
    return new Proxy({}, {
        get(target, prop) {
            if (!cache[prop]) {
                const positions = computeAttractor({
                    type: prop,
                    steps: 3000,
                });
                cache[prop] = buildSignatureForComparison(positions, "xy");
            }
            return cache[prop];
        },
    });
})();
const PROJECTION_REFERENCE_SIGNATURES = new Map();
function getReferenceSignature(type, projection) {
    const key = `${type}:${projection}`;
    const cached = PROJECTION_REFERENCE_SIGNATURES.get(key);
    if (cached)
        return cached;
    const positions = computeAttractor({
        type,
        steps: 3000,
    });
    const signature = buildSignatureForComparison(positions, projection);
    PROJECTION_REFERENCE_SIGNATURES.set(key, signature);
    return signature;
}
/**
 * Compare system behavior to known strange attractors
 */
export function compareToAttractors(systemBehavior, projection = "xy", options = {}) {
    const sig = buildSignatureForComparison(systemBehavior, projection);
    const flowAlignment = options.gradient
        ? computeFlowAlignment(systemBehavior, options.gradient, {
            sampleStride: options.flowSampleStride,
            minNorm: options.flowMinNorm,
        })
        : null;
    // Compute similarity to each known attractor
    const scores = {
        aizawa: computeSimilarity(sig, getReferenceSignature("aizawa", projection)),
        lorenz: computeSimilarity(sig, getReferenceSignature("lorenz", projection)),
        rossler: computeSimilarity(sig, getReferenceSignature("rossler", projection)),
        henon: computeSimilarity(sig, getReferenceSignature("henon", projection)),
        duffing: computeSimilarity(sig, getReferenceSignature("duffing", projection)),
    };
    const bestMatch = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
    const [matchType, matchScore] = bestMatch;
    // Classification logic
    let regime;
    const stronglyCoherentShape = sig.fitError < 0.02 &&
        sig.roughness < 0.02 &&
        (sig.symmetry > 0.5 || sig.anisotropy < 0.45);
    const coherentGate = stronglyCoherentShape && flowAlignment?.mode !== "uphill";
    if (coherentGate) {
        // Circle-like / smooth structures should not be overridden by nearest-label similarity.
        regime = "coherent";
    }
    else if (matchScore > 0.7) {
        // Strongly matches a known chaotic attractor
        regime = "chaotic";
    }
    else if (sig.fitError > 0.5) {
        // High fit error but doesn't match known attractors
        regime = "predatory";
    }
    else {
        regime = "turbulent";
    }
    return {
        bestMatch: matchScore > 0.5 ? matchType : null,
        similarity: matchScore,
        regime,
        scores,
        diagnostics: {
            projection,
            fitError: sig.fitError,
            symmetry: sig.symmetry,
            roughness: sig.roughness,
            anisotropy: sig.anisotropy,
            coherentGate,
            matchScore,
            flowAlignment: flowAlignment?.meanCosine ?? null,
            flowAlignmentAbs: flowAlignment?.meanAbsCosine ?? null,
            flowAlignmentSamples: flowAlignment?.samples ?? 0,
            flowAlignmentMode: flowAlignment?.mode ?? "unavailable",
        },
    };
}
/**
 * Compute similarity between two geometric signatures
 */
function computeSimilarity(sig1, sig2) {
    // Weighted similarity across multiple features
    const fitErrorSim = 1 - Math.abs(sig1.fitError - sig2.fitError);
    const symmetrySim = 1 - Math.abs(sig1.symmetry - sig2.symmetry);
    const roughnessSim = 1 - Math.abs(sig1.roughness - sig2.roughness);
    const anisotropySim = 1 - Math.abs(sig1.anisotropy - sig2.anisotropy);
    // Weighted average (fit error and symmetry are most important)
    return (0.4 * fitErrorSim +
        0.3 * symmetrySim +
        0.2 * roughnessSim +
        0.1 * anisotropySim);
}
function computeFlowAlignment(positions, gradient, options = {}) {
    const pointCount = Math.floor(positions.length / 3);
    if (pointCount < 2)
        return null;
    const stride = Math.max(1, Math.floor(options.sampleStride ?? 1));
    const minNorm = Math.max(1e-12, options.minNorm ?? 1e-9);
    let sumCos = 0;
    let sumAbsCos = 0;
    let samples = 0;
    for (let i = stride; i < pointCount; i += stride) {
        const currIndex = i * 3;
        const prevIndex = (i - stride) * 3;
        const s = [
            positions[currIndex] ?? 0,
            positions[currIndex + 1] ?? 0,
            positions[currIndex + 2] ?? 0,
        ];
        const dotS = [
            (positions[currIndex] ?? 0) - (positions[prevIndex] ?? 0),
            (positions[currIndex + 1] ?? 0) - (positions[prevIndex + 1] ?? 0),
            (positions[currIndex + 2] ?? 0) - (positions[prevIndex + 2] ?? 0),
        ];
        const grad = gradient(s);
        const gradNorm = norm3(grad);
        const flowNorm = norm3(dotS);
        if (gradNorm < minNorm || flowNorm < minNorm)
            continue;
        const cosine = clampUnit(dot3(grad, dotS) / (gradNorm * flowNorm));
        sumCos += cosine;
        sumAbsCos += Math.abs(cosine);
        samples++;
    }
    if (samples === 0)
        return null;
    const meanCosine = sumCos / samples;
    const meanAbsCosine = sumAbsCos / samples;
    return {
        meanCosine,
        meanAbsCosine,
        samples,
        mode: classifyFlowAlignment(meanCosine, meanAbsCosine),
    };
}
function classifyFlowAlignment(meanCosine, meanAbsCosine) {
    if (meanCosine <= -0.6)
        return "descent";
    if (meanCosine >= 0.3)
        return "uphill";
    if (Math.abs(meanCosine) <= 0.15 && meanAbsCosine <= 0.25) {
        return "orthogonal";
    }
    return "mixed";
}
function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm3(v) {
    return Math.sqrt(dot3(v, v));
}
function clampUnit(x) {
    if (x > 1)
        return 1;
    if (x < -1)
        return -1;
    return x;
}
