import Button from '@/components/Button'
import ChatInterface from '@/components/ChatInterface'
import TitleBox from '@/components/TitleBox'
import React from 'react'

const v1 = () => {
  return (
    <div>
        <Button text="Back" route="/" />
        <TitleBox title="Version 1" subtitle="No vector embedding" discription="This is the first version of the RAG Chatbot. It is a simple chatbot that can answer questions based on the provided context by matching words without using vector embeddings." />
<ChatInterface />

    </div>
  )
}

export default v1