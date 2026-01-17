/**
 * Owner: Person A
 * Responsibility: Handle webcam access and streaming
 */

export async function getVideoStream() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                frameRate: 30
            },
            audio: false
        });
        return stream;
    } catch (error) {
        console.error("Error accessing webcam:", error);
        throw error;
    }
}
