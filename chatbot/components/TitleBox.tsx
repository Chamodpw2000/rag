'use client';
import React from 'react'
import { useRouter } from 'next/navigation';
interface TitleBoxProps {
    title: string;
    subtitle?: string;
    discription?: string;
}

const TitleBox = ({ title, subtitle, discription }: TitleBoxProps) => {
    const router = useRouter();
    return (
        <div>
            <h1>{title}</h1>
            <h2>{subtitle}</h2>
            <p>{discription}</p>
        </div>

    )
}

export default TitleBox