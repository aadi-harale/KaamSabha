type Intake = {
  suggestedServiceCategory: string;
  suggestedTask: string;
  issueSummary: string;
  scopeDraft: string[];
  clarifyingQuestions: string[];
  possibleUrgency: 'routine' | 'soon' | 'urgent' | 'uncertain';
  possibleToolsOrMaterials: string[];
  uncertaintyNote: string;
};

function valid(value: unknown): value is Intake {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['suggestedServiceCategory', 'suggestedTask', 'issueSummary', 'uncertaintyNote'].every(
    (key) => typeof item[key] === 'string',
  ) && ['scopeDraft', 'clarifyingQuestions', 'possibleToolsOrMaterials'].every(
    (key) => Array.isArray(item[key]) && (item[key] as unknown[]).every((entry) => typeof entry === 'string'),
  ) && ['routine', 'soon', 'urgent', 'uncertain'].includes(String(item.possibleUrgency));
}

export async function POST(request: Request) {
  const { description } = (await request.json()) as { description?: string };
  if (!description?.trim() || description.length > 800)
    return Response.json({ error: 'Enter a short description of the problem.' }, { status: 400 });
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey)
    return Response.json({ error: 'AI intake is unavailable; manual booking remains available.' }, { status: 503 });
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gpt-4.1-mini';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'Convert a household service problem into JSON only. Allowed categories: Electrician, Plumber, Home cleaning, Appliance repair, Caregiving. Return suggestedServiceCategory, suggestedTask, issueSummary, scopeDraft string array, clarifyingQuestions string array, possibleUrgency routine|soon|urgent|uncertain, possibleToolsOrMaterials string array, uncertaintyNote. Never select a worker or decide price.' },
          { role: 'user', content: description.trim() },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    const parsed: unknown = content ? JSON.parse(content) : null;
    if (!valid(parsed)) throw new Error('Provider response did not match the intake schema');
    return Response.json(parsed);
  } catch {
    return Response.json({ error: 'AI intake could not finish; manual booking remains available.' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
