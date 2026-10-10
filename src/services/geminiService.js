import { GoogleGenAI } from '@google/genai';

/**
 * Retrieve active Gemini API key from environment variable or local storage
 */
export function getActiveApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  const localKey = localStorage.getItem('keaos_gemini_api_key');
  if (localKey && localKey.trim().length > 0) return localKey.trim();
  return null;
}

export function saveLocalApiKey(key) {
  if (key && key.trim().length > 0) {
    localStorage.setItem('keaos_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('keaos_gemini_api_key');
  }
}

/**
 * Validate Gemini API Key with a live test ping
 */
export async function testGeminiApiKey(apiKey) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Ping test. Reply with "OK".'
    });
    return { success: true, message: 'API Key is valid and active!', responseText: response.text };
  } catch (error) {
    return { success: false, message: error?.message || 'Failed to authenticate with Gemini API.' };
  }
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Real Multimodal Audio Transcription via Gemini 2.0 Flash
 */
export async function transcribeAudioReal(audioFile, apiKey) {
  const key = apiKey || getActiveApiKey();
  if (!key) throw new Error('Missing Gemini API Key. Please provide it in .env.local or API Settings.');

  const ai = new GoogleGenAI({ apiKey: key });

  // Convert File to base64 safely
  const arrayBuffer = await audioFile.arrayBuffer();
  const base64Data = arrayBufferToBase64(arrayBuffer);

  const mimeType = audioFile.type || 'audio/mp3';

  const startTime = performance.now();
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      {
        text: 'Transcribe this audio meeting recording verbatim with speaker labels and timestamps in the format: [MM:SS] Speaker Name: Dialogue.'
      }
    ]
  });

  const durationMs = Math.round(performance.now() - startTime);

  return {
    transcript: response.text,
    durationMs,
    usage: response.usageMetadata
  };
}

/**
 * Real Meeting Synthesis via Structured Gemini JSON Schema
 */
export async function synthesizeMeetingReal({
  transcript,
  systemPrompt,
  modelName = 'gemini-2.0-flash',
  temperature = 0.2,
  apiKey
}) {
  const key = apiKey || getActiveApiKey();
  if (!key) throw new Error('Missing Gemini API Key. Please provide it in .env.local or API Settings.');

  const ai = new GoogleGenAI({ apiKey: key });

  const structuredPrompt = `
Analyze the following meeting transcript with high analytical precision.
You MUST output your response in valid JSON matching this exact structure:
{
  "summary": ["bullet 1", "bullet 2", "bullet 3"],
  "decisions": ["formal decision 1", "formal decision 2"],
  "actionItems": [
    {
      "id": "ACT-01",
      "assignee": "Full Name",
      "task": "Specific actionable task",
      "deadline": "Stated or inferred deadline",
      "priority": "Critical | High | Medium | Low",
      "jiraTicket": "ENG-101"
    }
  ],
  "sentiment": "Brief tone, team morale and conflict summary"
}

Transcript:
${transcript}
`;

  const startTime = performance.now();
  const response = await ai.models.generateContent({
    model: modelName.includes('pro') ? 'gemini-1.5-pro' : 'gemini-2.0-flash',
    contents: structuredPrompt,
    config: {
      temperature,
      systemInstruction: systemPrompt || 'You are an institutional executive meeting intelligence assistant.',
      responseMimeType: 'application/json'
    }
  });

  const durationMs = Math.round(performance.now() - startTime);
  const parsedData = JSON.parse(response.text);

  return {
    parsedData,
    rawText: response.text,
    durationMs,
    usage: response.usageMetadata
  };
}

/**
 * Real LLM-as-a-Judge Evaluation for Golden Dataset
 */
export async function evaluateTestCaseWithJudge({
  transcript,
  generatedSummary,
  generatedActions,
  groundTruth,
  apiKey
}) {
  const key = apiKey || getActiveApiKey();
  if (!key) throw new Error('Missing Gemini API Key for evaluation judge.');

  const ai = new GoogleGenAI({ apiKey: key });

  const judgePrompt = `
You are an expert AI quality evaluation judge.
Given a raw transcript, the ground truth expected output, and the actual agent output, evaluate:
1. Faithfulness Score (0-100%): Are there any hallucinations or unsupported claims compared to the raw transcript?
2. Action Item Extraction F1 Score (0-100%): Did the agent extract all correct tasks, assignees, and deadlines?

Ground Truth:
${JSON.stringify(groundTruth, null, 2)}

Actual Agent Output:
Summary: ${JSON.stringify(generatedSummary)}
Action Items: ${JSON.stringify(generatedActions)}

Raw Transcript:
${transcript}

Output ONLY valid JSON:
{
  "faithfulness": 95,
  "actionItemF1": 92,
  "critique": "Brief justification of scores"
}
`;

  const startTime = performance.now();
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: judgePrompt,
    config: {
      temperature: 0.0,
      responseMimeType: 'application/json'
    }
  });
  const latencyMs = Math.round(performance.now() - startTime);
  const scoreData = JSON.parse(response.text);

  return {
    faithfulness: scoreData.faithfulness,
    actionItemF1: scoreData.actionItemF1,
    critique: scoreData.critique,
    latencySec: Number((latencyMs / 1000).toFixed(2))
  };
}
