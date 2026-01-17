/**
 * Owner: Person A
 * Responsibility: Debounce and decide when to fire a real alert
 */

let slouchStartTime = null;
const SLOUCH_DURATION_MS = 2000; // Must slouch for 2 seconds to trigger
let hasTriggeredForThisEpisode = false;

export function processPostureState(state, onTriggerCallback) {
    if (state === "slouching") {
        if (!slouchStartTime) {
            slouchStartTime = Date.now();
        } else {
            const elapsed = Date.now() - slouchStartTime;
            if (elapsed > SLOUCH_DURATION_MS && !hasTriggeredForThisEpisode) {
                // IT'S REAL!
                console.log(">>> SLOUCH TRIGGERED <<<");
                if (onTriggerCallback) onTriggerCallback();
                hasTriggeredForThisEpisode = true;
            }
        }
    } else if (state === "upright") {
        // Reset
        slouchStartTime = null;
        hasTriggeredForThisEpisode = false;
    }
}
