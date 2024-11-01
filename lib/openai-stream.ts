import { OpenAIStreamPayload } from "@/types/openai";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";

export async function OpenAIStream(payload: OpenAIStreamPayload) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  try {
    // Validate API key
    if (!payload.apiKey || typeof payload.apiKey !== 'string') {
      throw new Error('Invalid or missing API key');
    }

    // Basic payload validation
    if (!payload.model || !Array.isArray(payload.messages)) {
      throw new Error('Invalid payload structure');
    }

    // Log request attempt (remove in production)
    console.log('Attempting OpenAI request to:', 'https://api.openai.com/v1/chat/completions');

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${payload.apiKey}`,
      },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        max_tokens: payload.max_tokens || 2048,
        temperature: payload.temperature || 0.7,
        stream: true,
      }),
    });

    // Check for response errors
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });
      throw new Error(`OpenAI API Error: ${response.status} - ${errorData}`);
    }

    // Validate response body
    if (!response.body) {
      throw new Error('No response body received from OpenAI');
    }

    const stream = new ReadableStream({
      async start(controller) {
        const onParse = (event: ParsedEvent | ReconnectInterval) => {
          if (event.type === "event") {
            const data = event.data;

            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(data);
              const text = json.choices[0].delta?.content || "";
              const queue = encoder.encode(text);
              controller.enqueue(queue);
            } catch (e) {
              console.error('Error parsing stream data:', e);
              controller.error(e);
            }
          }
        };

        const parser = createParser(onParse);

        try {
          for await (const chunk of response.body as any) {
            parser.feed(decoder.decode(chunk));
          }
        } catch (streamError) {
          console.error('Stream processing error:', streamError);
          controller.error(streamError);
        }
      },
    });

    return stream;
  } catch (error) {
    console.error('OpenAI Stream Error:', error);
    throw error;
  }
}