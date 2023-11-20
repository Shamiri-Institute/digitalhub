"use client"
import React from 'react'
import Link from "next/link"
import { Icons } from '#/components/icons'
import { RefundForm } from './refund-form'

export default function RefundPage() {
    return (
        <>
            <PageHeader />
            <RefundForm />
        </>
    )
}

function PageHeader() {
    return (
        <div className='flex justify-end mt-2'>
            <Link href={'/profile'} >
                <Icons.xIcon className='w-6 h-6' />
            </Link>
        </div>
    )
}





