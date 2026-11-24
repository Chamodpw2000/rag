'use client';

import Button from "@/components/Button";
import { useRouter } from "next/dist/client/components/navigation";

export default function Home() {

  const router = useRouter();
  return (
    <div>

      <div>Chatbot</div>

      <div>Select the Version</div>

      <Button text="Version 1" route="/v1" />


    </div>
  );
}
