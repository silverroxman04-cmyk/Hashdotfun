// Vercel serverless function: /api/chat
// Keeps your xAI API key secret on the server side.
// The browser calls this endpoint instead of calling xAI directly.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { message, history } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing "message" in request body' });
  }

  // Keep the conversation short server-side too, so costs stay predictable.
  const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4.1-fast', // cheap/fast model, good for a study-help chatbot
        messages: [
          {
            role: 'system',
            content:
              'You are the study assistant for HashQuiz, a quiz practice app. ' +
              'Help users understand quiz topics, explain answers, and quiz them further. ' +
              'Keep answers concise and encouraging.',
          },
          ...trimmedHistory,
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('xAI API error:', errText);
      return res.status(502).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a reply.';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat function error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
