import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner';
import { 
    PREFIX_CONSIGNMENT_RETURN, 
    PREFIX_CONSIGNMENT_TRANSFER, 
    PREFIX_INTERNAL_RETURN, 
    PREFIX_PO, 
    PREFIX_RETURN, 
    PREFIX_RO,
    PREFIX_RIS
} from '../constants';

// NOTE: This prefix is not in constants.ts but is assumed for the dedicated PrintDispensePage
const PREFIX_DISPENSE = 'DISP-'; 

/**
 * A "smart router" for print vouchers.
 * This page intercepts any calls to the generic '/print/:logId' route.
 * It inspects the prefix of the logId and redirects to the correct, specialized
 * print page if one exists. This is a robust way to handle legacy or incorrectly
 * generated links and ensures the correct voucher is always displayed.
 * Vouchers without a special print page should not be linked here.
 */
const PrintPage: React.FC = () => {
    const { logId } = useParams<{ logId: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        if (!logId) {
            navigate('/404', { replace: true });
            return;
        }

        // --- Redirect logic for vouchers with special print pages ---
        if (logId.startsWith(PREFIX_RO)) {
            navigate(`/print/ro/${logId}`, { replace: true });
        } else if (logId.startsWith(PREFIX_PO)) {
            navigate(`/print/po/${logId}`, { replace: true });
        } else if (logId.startsWith(PREFIX_DISPENSE)) {
            navigate(`/print/dispense/${logId}`, { replace: true });
        } else if (logId.startsWith(PREFIX_RETURN)) {
             navigate(`/print/return/${logId}`, { replace: true });
        } else if (logId.startsWith(PREFIX_CONSIGNMENT_RETURN)) {
             navigate(`/print/consignment-return/${logId}`, { replace: true });
        } else if (logId.startsWith(PREFIX_INTERNAL_RETURN)) {
             navigate(`/print/return-internal/${logId}`, { replace: true });
        } else if (logId.startsWith(PREFIX_CONSIGNMENT_TRANSFER)) {
             navigate(`/print/consignment-transfer/${logId}`, { replace: true });
        } else if (logId.startsWith(PREFIX_RIS)) {
             navigate(`/print/ris/${logId}`, { replace: true });
        }
        // If no prefix matches, this component will continue to show the loading spinner.
        // This indicates that a voucher type without a dedicated print page was incorrectly routed here.
        // The correct fix would be to adjust the source link to point to a valid print page.

    }, [logId, navigate]);

    // Display a loading spinner while redirecting. This prevents a blank white screen.
    return (
        <div className="flex justify-center items-center h-screen bg-secondary-100">
            <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-secondary-600">Preparing voucher for printing...</p>
            </div>
        </div>
    );
};

export default PrintPage;
