import { openai } from "./openai.js";
import math from "advanced-calculator";

const QUESTION = process.argv[2] || "hi";

const messages = [
  {
    role: "system",
    content:
      "You are a helpful mathematician. Use the supplied tools to assist the user.",
  },
  {
    role: "user",
    content: QUESTION,
  },
];

const functions = {
  calculate: ({ expression }) => {
    console.log("hello");
    return math.evaluate(expression);
  },
};

const getCompletion = (msg) => {
  return openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0,
    tools: [
      {
        type: "function",
        function: {
          name: "calculate",
          description: "Run math expressions",
          parameters: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description:
                  'The math expression to evaluate like "2 * 3 + (21 / 2) ^ 2"',
              },
            },
            required: ["expression"],
          },
        },
      },
    ],
  });
};

let response;
while (true) {
  response = await getCompletion(messages);

  if (response.choices[0].finish_reason === "stop") {
    console.log(response.choices[0].message.content);
    break;
  } else if (response.choices[0].finish_reason === "tool_calls") {
    const fnName = response.choices[0].message.tool_calls[0].function.name;
    const args = response.choices[0].message.tool_calls[0].function.arguments;

    const fnToCall = functions[fnName];
    const argsToCall = JSON.parse(args);

    const result = fnToCall(argsToCall);

    messages.push(response.choices[0].message);

    messages.push({
      role: "tool",
      content: JSON.stringify({
        result,
      }),
      tool_call_id: response.choices[0].message.tool_calls[0].id,
    });
  }
}
