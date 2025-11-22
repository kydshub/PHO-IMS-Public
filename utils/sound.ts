// utils/sound.ts

let audioContext: AudioContext | null = null;
const audioBuffers: Map<string, AudioBuffer> = new Map();

const soundSources = {
    messageSent: '/sounds/send-message.wav',
    messageReceived: '/sounds/receive-message.wav'
};

/**
 * Initializes (or resumes) the shared AudioContext.
 * This must be called from within a user interaction event (e.g., click, keydown).
 * @returns {Promise<boolean>} True if the context is successfully running.
 */
export const unlockAudio = async (): Promise<boolean> => {
    if (audioContext && audioContext.state === 'running') {
        return true;
    }
    try {
        if (!audioContext) {
            // Create the audio context. The 'webkit' prefix is for older Safari versions.
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        // If the context is suspended (as it is by default in modern browsers), resume it.
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Once the context is running, pre-load the sound files for faster playback.
        if (audioContext.state === 'running') {
            await Promise.all(
                Object.keys(soundSources).map(key => loadSound(key as keyof typeof soundSources))
            );
            return true;
        }
    } catch (e) {
        console.error("Could not initialize AudioContext:", e);
        audioContext = null; // Mark as failed
        return false;
    }
    return false;
};


/**
 * Fetches an audio file and decodes it into an AudioBuffer, caching the result.
 * @param sound The key of the sound to load.
 * @returns {Promise<AudioBuffer | null>} The decoded audio buffer or null on error.
 */
const loadSound = async (sound: keyof typeof soundSources): Promise<AudioBuffer | null> => {
    if (!audioContext) {
        console.warn("AudioContext not initialized, cannot load sound.");
        return null;
    }
    if (audioBuffers.has(sound)) {
        return audioBuffers.get(sound)!;
    }

    try {
        const response = await fetch(soundSources[sound]);
        if (!response.ok) {
            throw new Error(`Failed to fetch sound: ${response.statusText} at ${soundSources[sound]}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.set(sound, audioBuffer);
        return audioBuffer;
    } catch (e) {
        console.error(`Error loading sound "${sound}":`, e);
        return null;
    }
};

/**
 * Plays a preloaded sound effect using the Web Audio API.
 * @param sound The key of the sound to play.
 */
export const playSound = async (sound: keyof typeof soundSources) => {
    if (!audioContext || audioContext.state !== 'running') {
        const unlocked = await unlockAudio();
        if (!unlocked) {
            console.warn(`AudioContext not running. Cannot play sound "${sound}". User interaction might be required.`);
            return;
        }
    }

    let buffer = audioBuffers.get(sound);
    if (!buffer) {
        // Attempt to load on-the-fly if not pre-loaded.
        buffer = await loadSound(sound);
    }
    
    if (!buffer) {
        console.error(`Sound buffer for "${sound}" not available or failed to load.`);
        return;
    }

    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    } catch (e) {
        console.error(`Error playing sound "${sound}":`, e);
    }
};