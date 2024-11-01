import { OpenAIStream } from "@/lib/openai-stream";
import { createClient } from "@/lib/supabase/supabase-server";

export const runtime = "experimental-edge";

// export async function POST(req: Request): Promise<Response> {
//   const { payload } = await req.json();

//   // Create Supabase Server Client
//   const supabase = createClient();
//   const {
//     data: { session },
//   } = await supabase.auth.getSession();

//   // If no session, return 401
//   if (!session) {
//     return new Response("Not authorized!", { status: 401 });
//   }

//   if (!payload) {
//     return new Response("No payload!", { status: 400 });
//   }

//   const stream = await OpenAIStream(payload);

//   return new Response(stream);
// }

export async function POST(req: Request): Promise<Response> {
  try {
    const { payload } = await req.json();

    // Create Supabase Server Client
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response("Not authorized", { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!payload) {
      return new Response(JSON.stringify({ error: "No payload provided" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stream = await OpenAIStream(payload);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error:any) {
    console.error('API Route Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
