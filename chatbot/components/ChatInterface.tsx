'use client';
import React, { useState } from 'react'

const ChatInterface = () => {
interface Message {
    text: string;
    sender: 'user' | 'bot';
}
const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! How can I assist you today?", sender: 'bot' },

    { text: "I can help you with your questions.", sender: 'user' },
    { text: "Feel free to ask me anything.", sender: 'bot' },
]);


  return (
    <div className="bg-gray-200 p-4 my-4 rounded-lg flex flex-col gap-y-2">
     <div>ChatInterface</div>
     <div className="flex flex-col gap-y-1">

{
    messages.map((message, index) => (
        <div key={index} className={message.sender === 'user' ? "self-end bg-green-500 text-white p-2 rounded-lg my-1 max-w-2xl" : "self-start bg-blue-500 text-white p-2 rounded-lg my-1 max-w-xl"}>
            {message.text}
        </div>
    ))
}


     </div>
    </div>
  )
}

export default ChatInterface