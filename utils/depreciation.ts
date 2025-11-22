
import { AssetItem } from '../types';

interface DepreciationResult {
    age: number;
    depreciatedValue: number;
}

export const calculateDepreciation = (asset: AssetItem): DepreciationResult => {
    if (!asset.purchaseDate) {
        return { age: 0, depreciatedValue: asset.acquisitionPrice };
    }

    const purchaseDate = new Date(asset.purchaseDate);
    const now = new Date();
    const ageInMs = now.getTime() - purchaseDate.getTime();
    const age = ageInMs / (1000 * 60 * 60 * 24 * 365.25);

    if (!asset.usefulLife || asset.usefulLife <= 0) {
        return { age, depreciatedValue: asset.acquisitionPrice };
    }

    const salvageValue = asset.salvageValue || 0;
    const depreciableBase = asset.acquisitionPrice - salvageValue;

    if (depreciableBase <= 0) {
        return { age, depreciatedValue: asset.acquisitionPrice };
    }
    
    const annualDepreciation = depreciableBase / asset.usefulLife;
    const accumulatedDepreciation = Math.min(annualDepreciation * age, depreciableBase);
    
    const depreciatedValue = asset.acquisitionPrice - accumulatedDepreciation;

    return { age, depreciatedValue: Math.max(depreciatedValue, salvageValue) };
};
