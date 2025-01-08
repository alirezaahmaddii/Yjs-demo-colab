import {useStatus} from "@powersync/react";

export const StatusDisplay = () => {
    const status = useStatus();
    return (
        <>
            <span>{status.connected ? 'Connected' : 'Disconnected'}</span>
            <span>{!status.hasSynced ? 'Busy syncing...' : 'Synced!'}</span>
        </>
    )
};

