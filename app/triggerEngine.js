/**
 * Owner: Person A
 * Responsibility: Debounce and decide when to fire a real alert
 */

let slouchStartTime = null;
const SLOUCH_DURATION_MS = 2000; // Must slouch for 2 seconds to trigger
const COOLDOWN_DURATION_MS = 30000; // 30 seconds cooldown
let lastTriggerTime = 0;
let hasTriggeredForThisEpisode = false;

export function processPostureState(state, onTriggerCallback) {
    if (state === "slouching") {
        if (!slouchStartTime) {
            slouchStartTime = Date.now();
        } else {
            const elapsed = Date.now() - slouchStartTime;
            const timeSinceLastTrigger = Date.now() - lastTriggerTime;

            if (elapsed > SLOUCH_DURATION_MS && !hasTriggeredForThisEpisode && timeSinceLastTrigger > COOLDOWN_DURATION_MS) {
                // IT'S REAL!
                console.log(">>> SLOUCH TRIGGERED <<<");
                if (onTriggerCallback) onTriggerCallback();
                hasTriggeredForThisEpisode = true;
                lastTriggerTime = Date.now();
            }
        }
    } else if (state === "upright") {
        // Reset
        slouchStartTime = null;
        hasTriggeredForThisEpisode = false;
    }
}
