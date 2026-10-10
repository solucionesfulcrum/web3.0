import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const HISTORY_LIMIT = 10;
const MESSAGE_LENGTH_LIMIT = 2000;

export async function POST(request) {
    try {
        const { message, history = [] } = await request.json();

        if (typeof message !== "string" || !message.trim() || message.length > MESSAGE_LENGTH_LIMIT) {
            return Response.json(
                { error: "Mensaje inválido" },
                { status: 400 }
            );
        }

        // Enforce the context budget and accepted roles on the server as well.
        const recentHistory = Array.isArray(history)
            ? history.slice(-HISTORY_LIMIT)
                .filter(item => item && (item.role === "user" || item.role === "assistant")
                    && typeof item.content === "string" && item.content.trim())
                .map(item => ({ role: item.role, content: item.content.trim().slice(0, MESSAGE_LENGTH_LIMIT) }))
            : [];

        const response = await client.responses.create({
            model: "gpt-4.1-mini",
            instructions: `
Eres el asistente comercial con inteligencia artificial de FULCRUM.

Tu objetivo es entender la necesidad del visitante y orientarlo hacia
una solución tecnológica adecuada.

Reglas:
- Responde en español.
- Sé breve y profesional.
- No inventes precios.
- No prometas tiempos de entrega sin suficiente información.
- Puedes orientar sobre desarrollo web, software personalizado,
  automatización, inteligencia artificial e integraciones.
- La interfaz ya muestra al inicio de cada conversación: "Hola, soy el asistente IA de FULCRUM. ¿En qué podemos ayudarte hoy?"
- Esa presentación ocurre solo en el primer mensaje de la interfaz. No debes presentarte nuevamente como "asistente IA de FULCRUM" en tus respuestas.
- La conversación ya comenzó: responde directamente a la consulta, incluso si no recibes historial o este está recortado.
- Evita repetir saludos como "Hola".
- Mantén respuestas naturales y continuas. Usa el historial reciente para entender referencias y dar seguimiento sin repetir preguntas ya respondidas.
      `,
            input: [...recentHistory, { role: "user", content: message.trim() }],
            max_output_tokens: 300,
        });

        return Response.json({
            reply: response.output_text,
        });
    } catch (error) {
        console.error(error);

        return Response.json(
            { error: "No se pudo procesar la consulta" },
            { status: 500 }
        );
    }
}
