import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTrigger,
} from "#/components/ui/dialog";

let comments = [{
    id: 1,
    clinicalExpertName: 'Clinical expert 1',
    date: '22/08/2023',
    comment: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe ex, voluptates quos dolor quae vero repellat tempora! Rem, officiis cumque. Dignissimos voluptas suscipit dolor vitae animi corporis iste iusto molestiae.'
}, {
    id: 2,
    clinicalExpertName: 'Clinical expert 2',
    date: '22/08/2023',
    comment: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe ex, voluptates quos dolor quae vero repellat tempora! Rem, officiis cumque. Dignissimos voluptas suscipit dolor vitae animi corporis iste iusto molestiae.'
}, {
    id: 3,
    clinicalExpertName: 'Clinical expert 3',
    date: '22/08/2023',
    comment: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe ex, voluptates quos dolor quae vero repellat tempora! Rem, officiis cumque. Dignissimos voluptas suscipit dolor vitae animi corporis iste iusto molestiae.'
}, {
    id: 4,
    clinicalExpertName: 'Clinical expert 4',
    date: '22/08/2023',
    comment: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe ex, voluptates quos dolor quae vero repellat tempora! Rem, officiis cumque. Dignissimos voluptas suscipit dolor vitae animi corporis iste iusto molestiae.'
}, {
    id: 5,
    clinicalExpertName: 'Clinical expert 5',
    date: '22/08/2023',
    comment: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe ex, voluptates quos dolor quae vero repellat tempora! Rem, officiis cumque. Dignissimos voluptas suscipit dolor vitae animi corporis iste iusto molestiae.'
}]


const CommentsDialogue = ({
    children
}: {
    children: React.ReactNode
}) => {
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="gap-0 p-0">
                <DialogHeader className="space-y-0 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-medium">
                            5 Comments
                        </span>
                    </div>
                </DialogHeader>
                <div className="my-6 space-y-6">
                    <div className="px-4">
                        {
                            comments.map((comment) => (
                                <Comment
                                    key={comment.id}
                                    clinicalExpertName={comment.clinicalExpertName}
                                    date={comment.date}
                                    comment={comment.comment}
                                />
                            ))
                        }
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default CommentsDialogue;


function Comment({
    clinicalExpertName,
    date,
    comment
}: {
    clinicalExpertName: string;
    date: string;
    comment: string;
}) {
    return (
        <div>
            <h3
                className='text-sm font-medium text-brand mt-1'
            >
                {clinicalExpertName} - {date}
            </h3>
            <p
                className='text-sm font-medium text-muted-foreground my-3'
            >
                {comment}
            </p>
        </div>
    )
}