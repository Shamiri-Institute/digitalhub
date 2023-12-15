import * as React from 'react';

import { Dialog, DialogTrigger, DialogContent } from "#/components/ui/dialog";

export function RequestRepaymentDialog({ children }: { children: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger>{children}</DialogTrigger>
            <DialogContent>
                hey
            </DialogContent>
        </Dialog>
    )
}