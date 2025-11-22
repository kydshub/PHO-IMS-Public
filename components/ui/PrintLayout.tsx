import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface PrintLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ children, title, actions }) => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = title;
        // Adding a small delay to ensure content is rendered before print dialog opens.
        const timeoutId = setTimeout(() => window.print(), 500);
        return () => clearTimeout(timeoutId);
    }, [title]);

    const handleClose = () => {
        // If the window was opened by another script (e.g., window.open),
        // window.opener will be non-null and window.close() will work as expected.
        // Otherwise, if it was navigated to in-page, go back in history to prevent closing the main app tab.
        if (window.opener) {
            window.close();
        } else {
            navigate(-1);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print { display: none !important; }
                    .printable-area {
                        box-shadow: none !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 1.5rem !important;
                        font-size: 10pt;
                    }
                    .printable-area h1 { font-size: 18pt; }
                    .printable-area h2 { font-size: 14pt; }
                    .printable-area th { font-size: 9pt; }
                    .printable-area .print-small-text { font-size: 8pt; }
                }
            `}</style>
             <div className="bg-secondary-200 p-4 sm:p-8 no-print">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center">
                        <h3 className="font-semibold">Print Preview: {title}</h3>
                        <div className="flex items-center space-x-2">
                            {actions}
                            <Button variant="secondary" onClick={() => window.print()} className="mr-2">Print</Button>
                            <Button variant="danger" onClick={handleClose}>Close</Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-6xl mx-auto p-8 sm:p-12 bg-white font-[Roboto,sans-serif] printable-area shadow-lg">
                {children}
            </div>
        </>
    );
};

export default PrintLayout;