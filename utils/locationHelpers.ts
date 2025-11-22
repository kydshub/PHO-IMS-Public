import { StorageLocation, Facility } from '../types';

export const buildIndentedLocationOptions = (locations: StorageLocation[]): { value: string; label: string }[] => {
    interface StorageLocationNode extends StorageLocation { children: StorageLocationNode[]; }
    const tree: StorageLocationNode[] = [];
    const map = new Map<string, StorageLocationNode>();

    locations.forEach((loc: StorageLocation) => map.set(loc.id, { ...loc, children: [] }));
    locations.forEach((loc: StorageLocation) => {
        if (loc.parentId && map.has(loc.parentId)) {
            map.get(loc.parentId)!.children.push(map.get(loc.id)!);
        } else {
            tree.push(map.get(loc.id)!);
        }
    });

    const options: { value: string; label: string }[] = [];
    const createOptions = (nodes: StorageLocationNode[], level = 0) => {
        nodes.sort((a,b) => a.name.localeCompare(b.name)).forEach(node => {
            options.push({
                value: node.id,
                label: `${'\u00A0\u00A0'.repeat(level)}${level > 0 ? '↳ ' : ''}${node.name}`
            });
            if (node.children.length > 0) {
                createOptions(node.children, level + 1);
            }
        });
    };
    
    createOptions(tree.sort((a,b) => a.name.localeCompare(b.name)));
    return options;
};

export const getStorageLocationPath = (locationId: string, allLocations: StorageLocation[], allFacilities: Facility[]): string => {
    const locationMap = new Map(allLocations.map((l: StorageLocation) => [l.id, l]));
    let path: string[] = [];
    let currentId: string | undefined = locationId;

    while (currentId && locationMap.has(currentId)) {
        const currentLocation = locationMap.get(currentId)!;
        path.unshift(currentLocation.name);
        currentId = currentLocation.parentId;
    }

    const facilityId = locationMap.get(locationId)?.facilityId;
    if (facilityId) {
        const facility = allFacilities.find((f: Facility) => f.id === facilityId);
        if (facility) {
            // If the top-level location name is the same as the facility name, don't prepend the facility name.
            if (!(path.length > 0 && path[0].toLowerCase() === facility.name.toLowerCase())) {
                path.unshift(facility.name);
            }
        }
    }
    return path.join(' / ');
};