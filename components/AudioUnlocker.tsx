import React, { useEffect, useRef } from 'react';
import { unlockAudio } from '../utils/sound';

/**
 * A hook that manages the one-time unlocking of the browser's AudioContext.
 * It attaches event listeners for the first user interaction and calls the
 * `unlockAudio` utility. Once successful, it cleans up its listeners.
 */
const useAudioUnlocker = () => {
    const unlockedRef = useRef(false);

    useEffect(() => {
        const handleInteraction = () => {
            // If already unlocked, do nothing.
            if (unlockedRef.current) {
                return;
            }
            
            // Attempt to unlock the audio context.
            unlockAudio().then(success => {
                if (success) {
                    unlockedRef.current = true;
                    // On success, clean up all listeners to avoid re-triggering.
                    document.body.removeEventListener('click', handleInteraction, { capture: true });
                    document.body.removeEventListener('keydown', handleInteraction, { capture: true });
                    document.body.removeEventListener('touchstart', handleInteraction, { capture: true });
                }
            });
        };

        // Attach listeners if not already unlocked.
        // The 'capture' option helps catch the event early before it might be stopped by other elements.
        if (!unlockedRef.current) {
            document.body.addEventListener('click', handleInteraction, { capture: true });
            document.body.addEventListener('keydown', handleInteraction, { capture: true });
            document.body.addEventListener('touchstart', handleInteraction, { capture: true });
        }

        // Return a cleanup function to remove listeners when the component unmounts,
        // which is good practice.
        return () => {
            document.body.removeEventListener('click', handleInteraction, { capture: true });
            document.body.removeEventListener('keydown', handleInteraction, { capture: true });
            document.body.removeEventListener('touchstart', handleInteraction, { capture: true });
        };
    }, []); // Empty dependency array ensures this runs only once on mount.
};


/**
 * A component that unlocks browser audio playback on the first user interaction.
 * It renders nothing and cleans up after itself.
 */
const AudioUnlocker: React.FC = () => {
    useAudioUnlocker();
    return null; // This component does not render anything to the DOM.
};

export default AudioUnlocker;
