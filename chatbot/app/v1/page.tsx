import Button from '@/components/Button'
import ChatInterface from '@/components/ChatInterface'
import TitleBox from '@/components/TitleBox'
import React from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const v1 = () => {
  return (
    <div className="h-full flex flex-col">
        <div className="shrink-0">
            <Button text="Back" route="/" />
            <TitleBox title="Version 1" subtitle="No vector embedding" discription="This is the first version of the RAG Chatbot. It is a simple chatbot that can answer questions based on the provided context by matching words without using vector embeddings." />
        </div>
        {/* min-h-0 lets the chat shrink to the remaining space so only its message list scrolls */}
        <div className="flex-1 min-h-0 mt-4">
            <ChatInterface
                endpoint={`${API_URL}/chat/stream`}
                title="Insurellm Assistant"
                greeting="Hello! Ask me anything about Insurellm, its employees or its products."
            />
        </div>
    </div>
  )
}

export default v1