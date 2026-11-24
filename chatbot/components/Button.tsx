'use client';
import React from 'react'
import { useRouter } from 'next/navigation';
interface ButtonProps {
    route: string;
    text: string;
}

const Button = ({ route, text }: ButtonProps) => {
    const router = useRouter();
  return (
    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer " onClick={() => router.push(route)  }>
      {text}
    </button>
  )
}

export default Button