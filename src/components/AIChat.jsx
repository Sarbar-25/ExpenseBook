import React, { useState } from "react";

export default function AIChat(props) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");

  const handleSend = async () => {
    try {
      const prompt = `
Transactions:
${JSON.stringify(props.transactions)}

Expenses:
${JSON.stringify(props.expenses)}

Question:
${input}
`;

      const res = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        }
      );

      const data = await res.json();

      console.log(data);

      setResponse(
        data?.choices?.[0]?.message?.content || "No response"
      );
    } catch (error) {
      console.log(error);
      setResponse("AI Error");
    }
  };

  return (
    <div
      style={{
        background: "#1877f2",
        padding: "20px",
        borderRadius: "12px",
        color: "white",
        marginTop: "20px",
      }}
    >
      <h2>AI Chat</h2>

      <input
        type="text"
        placeholder="Ask AI..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          color: "black",
          marginTop: "10px",
        }}
      />

      <button
        onClick={handleSend}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "10px",
        }}
      >
        Send
      </button>

      <div style={{ marginTop: "20px" }}>
        {response}
      </div>
    </div>
  );
}