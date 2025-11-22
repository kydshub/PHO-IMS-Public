import React, { useEffect, useRef } from 'react';

interface CaptchaProps {
  siteKey: string;
  onChange: (token: string | null) => void;
}

// Declare grecaptcha as a global variable to avoid potential conflicts with Window interface augmentations.
declare var grecaptcha: any;

const Captcha: React.FC<CaptchaProps> = ({ siteKey, onChange }) => {
  const captchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This function will be called to render or re-render the captcha
    const render = () => {
      if (captchaRef.current && grecaptcha?.render) {
        // Only render if the div is empty. This check prevents re-rendering in the same element,
        // which is a common issue with React's lifecycle and external scripts.
        if (captchaRef.current.innerHTML === '') {
            try {
                const successCallback = (token: string) => {
                  onChange(token);
                };
                const expiredCallback = () => {
                  onChange(null);
                };

                grecaptcha.render(captchaRef.current, {
                  sitekey: siteKey,
                  callback: successCallback,
                  'expired-callback': expiredCallback,
                });
            } catch (e) {
                console.error("Error rendering reCAPTCHA", e);
            }
        }
      }
    };
    
    // Check if the script is loaded, then render.
    const checkGrecaptchaAndRender = () => {
      if (grecaptcha && grecaptcha.render) {
        render();
      } else {
        // If the script isn't loaded, poll for it.
        const interval = setInterval(() => {
          if (grecaptcha && grecaptcha.render) {
            clearInterval(interval);
            render();
          }
        }, 100);
      }
    };
    
    checkGrecaptchaAndRender();
    
    return () => {
        // On unmount, clear the innerHTML. This helps with cleanup, especially
        // when navigating away from the component or during development with Strict Mode.
        if(captchaRef.current) {
            captchaRef.current.innerHTML = '';
        }
    };
  }, [siteKey, onChange]);
  
  return <div ref={captchaRef} className="flex justify-center my-4"></div>;
};

export default Captcha;