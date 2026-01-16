import Groq from 'groq-sdk';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getString } from '../utils/storageManager';

// Split by comma or newline, trim, and filter empty
const getApiKeys = () => {
    const raw = getString(STORAGE_KEYS.AI_API_KEY, '');
    return raw.split(/[\n,]+/).map(k => k.trim()).filter(k => k.startsWith('gsk_'));
};
const getModelName = () => getString(STORAGE_KEYS.AI_MODEL, 'llama-3.3-70b-versatile');

class AIService {
    constructor() {
        this.client = null;
        this.currentKeyIndex = 0;
    }

    _getClient(key) {
        return new Groq({
            apiKey: key,
            dangerouslyAllowBrowser: true
        });
    }

    /**
     * unified completion method that handles efficient key rotation
     */
    async createCompletion(params) {
        const keys = getApiKeys();
        if (keys.length === 0) {
            throw new Error('AI API Key not found. Please configure it in Settings.');
        }

        let lastError = null;

        // Try each key starting from the current index to avoid wasting requests on exhausted keys
        // If we circle back to the start, we've tried everyone
        for (let i = 0; i < keys.length; i++) {
            const index = (this.currentKeyIndex + i) % keys.length;
            const apiKey = keys[index];
            const client = this._getClient(apiKey);

            try {
                const completion = await client.chat.completions.create(params);

                // If successful, normalize currentKeyIndex to this working key
                this.currentKeyIndex = index;
                return completion;

            } catch (error) {
                console.warn(`API Key ending in ...${apiKey.slice(-4)} failed:`, error.message);
                lastError = error;

                // If it's an auth error (401) or rate limit (429), try next key.
                // Otherwise (e.g. 500, 400), it might be a real issue, but we'll try rotation for 429/401 specifically.
                // For robustness, we'll rotate on any network-ish error, but maybe abort on 400 (Bad Request).
                if (error.status === 400) {
                    throw error; // Don't rotate on bad request (invalid prompt etc)
                }
            }
        }

        throw new Error(`All API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    async validateApiKey(apiKeyInput) {
        // Handle input which might be multiple keys
        const keys = apiKeyInput.split(/[\n,\s]+/).map(k => k.trim()).filter(k => k.startsWith('gsk_'));

        if (keys.length === 0) {
            return { success: false, error: 'No valid API keys found. Keys must start with "gsk_".' };
        }

        const report = {
            valid: 0,
            invalid: 0,
            details: []
        };

        // Test all provided keys (in parallel for speed)
        const results = await Promise.allSettled(
            keys.map(async (key) => {
                const groq = this._getClient(key);
                await groq.chat.completions.create({
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'llama-3.1-8b-instant',
                    max_tokens: 5,
                });
                return key;
            })
        );

        results.forEach((result, i) => {
            const key = keys[i];
            if (result.status === 'fulfilled') {
                report.valid++;
                report.details.push(`✓ ...${key.slice(-4)}`);
            } else {
                report.invalid++;
                const errorCode = result.reason?.status || 'Error';
                report.details.push(`✗ ...${key.slice(-4)} (${errorCode})`);
            }
        });

        if (report.valid === 0) {
            return {
                success: false,
                error: `All ${keys.length} key(s) failed validation.`,
                details: report.details
            };
        }

        return {
            success: true,
            message: `${report.valid}/${keys.length} key${keys.length > 1 ? 's' : ''} validated successfully.`,
            details: report.details
        };
    }

    async parseSyllabus(syllabusText) {
        const modelName = getModelName();
        const prompt = `
      You are an expert academic assistant. I have pasted text that might be a SYLLABUS, a CANVAS GRADEBOOK, or a MESSY TASK LIST.
      Your goal is to extract every single assignment, exam, quiz, project, or reading that has a specific due date.
      
      Parsing Priorities:
      1. **Canvas Gradebook**:
         - "Assignment Name Due: Jan 12 at 11:59pm Submitted: Jan 10 / 100 pts"
         - **CRITICAL**: Use "Due:" date. Ignore "Submitted:".
      2. **Syllabus**:
         - Hunt for "Schedule" or "Calendar".
      3. **Generic Lists**:
         - "Read Chapter 5 by Friday" -> interpret date relative to Reference Date.
      
      Output Format (STRICT JSON):
      {
        "tasks": [
            {
                "title": "Exact Name",
                "dueDate": "YYYY-MM-DD", 
                "time": "HH:MM (24-hour style) OR null",
                "description": "Details or null"
            }
        ]
      }

      Rules:
      1. **Reference Date**: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
      2. **Implicit Year**: Calculate based on Reference Date.
      3. **Strict Date Parsing**: YYYY-MM-DD.
      4. **No Hallucinations**.
      
      Input Text:
      ${syllabusText}
    `;

        try {
            const completion = await this.createCompletion({
                messages: [
                    { role: 'system', content: 'You are a JSON-only response bot. Output a JSON object with a "tasks" key.' },
                    { role: 'user', content: prompt }
                ],
                model: modelName,
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            const text = completion.choices[0]?.message?.content || '{}';
            let parsed = JSON.parse(text);

            let tasks = [];
            if (Array.isArray(parsed)) {
                tasks = parsed;
            } else if (parsed && Array.isArray(parsed.tasks)) {
                tasks = parsed.tasks;
            } else {
                const values = Object.values(parsed);
                const arrayCandidate = values.find(v => Array.isArray(v));
                if (arrayCandidate) tasks = arrayCandidate;
            }

            return tasks;

        } catch (error) {
            console.error('Syllabus Parsing Error:', error);
            throw new Error('Failed to parse syllabus. ' + error.message);
        }
    }

    async refineSyllabusTasks(currentTasks, instructions) {
        const modelName = getModelName();
        const referenceDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const prompt = `
You are a task refinement assistant. Modify the given tasks based on the user's instructions.

**CRITICAL FORMAT RULES:**
- dueDate MUST be in format: YYYY-MM-DD (e.g., "2026-01-20")
- time MUST be in 24-hour format: HH:MM (e.g., "23:59" for 11:59 PM, "14:30" for 2:30 PM)
- If no time is specified or should be removed, set time to null
- Preserve task IDs exactly as given
- Do NOT add new fields that don't exist in the original tasks

**Reference Date (today):** ${referenceDate}
Use this to interpret relative dates like "next week", "tomorrow", "Friday", etc.

**Task Schema (each task must have these fields):**
{
  "id": "preserve-original-id",
  "title": "string",
  "dueDate": "YYYY-MM-DD or null",
  "time": "HH:MM (24-hour) or null",
  "description": "string or null",
  "status": "not-started",
  "course": "string or null"
}

**Common Operations Examples:**
- "Set all times to 11:59 PM" → set time to "23:59"
- "Remove readings" → filter out tasks with "reading" in title
- "Push everything back one week" → add 7 days to each dueDate
- "Set time to midnight" → set time to "00:00"

**Current Tasks:**
${JSON.stringify(currentTasks, null, 2)}

**User Instructions:**
"${instructions}"

Apply the user's instructions precisely. Return ONLY valid JSON:
{ "tasks": [ <modified tasks array> ] }
`;

        try {
            const completion = await this.createCompletion({
                messages: [
                    { role: 'system', content: 'You are a precise task modification assistant. You ONLY output valid JSON. You follow date/time format rules exactly: dueDate=YYYY-MM-DD, time=HH:MM (24-hour). You preserve task structure and IDs.' },
                    { role: 'user', content: prompt }
                ],
                model: modelName,
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            const text = completion.choices[0]?.message?.content || '{}';
            let parsed = JSON.parse(text);

            return Array.isArray(parsed) ? parsed : (parsed.tasks || []);

        } catch (error) {
            console.error('Syllabus Refinement Error:', error);
            throw new Error('Refinement failed. ' + error.message);
        }
    }

    async matchCanvasToTasks(assignment, potentialMatches) {
        const prompt = `
      Check if new Canvas assignment matches existing tasks.
      
      New:
      Title: "${assignment.name}"
      Due: "${assignment.due_at || 'No Match'}"
      Course: "${assignment.context_name || 'Unknown'}"
      
      Existing:
      ${JSON.stringify(potentialMatches.map(t => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            course: t.course
        })), null, 2)}
      
      Output (JSON):
      {
        "matchId": "id" OR null,
        "confidence": 0.0 to 1.0,
        "reason": "..."
      }
    `;

        try {
            const completion = await this.createCompletion({
                messages: [
                    { role: 'system', content: 'You are a JSON-only comparison bot.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.1-8b-instant', // Fast model
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            const text = completion.choices[0]?.message?.content || '{}';
            return JSON.parse(text);

        } catch (error) {
            return { matchId: null };
        }
    }

    async refineTaskMerge(currentProposedTask, canvasAssignment, instructions) {
        const modelName = getModelName();
        const referenceDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const prompt = `
You are refining a merged task that combines data from Canvas with an existing user task.

**CRITICAL FORMAT RULES:**
- time MUST be in 24-hour format: HH:MM (e.g., "23:59" for 11:59 PM, "09:00" for 9 AM)
- Do NOT use 12-hour format with AM/PM
- Return ONLY the fields shown in the schema below

**Reference Date (today):** ${referenceDate}

**Output Schema (return exactly these fields):**
{
  "title": "string",
  "time": "HH:MM (24-hour format)",
  "url": "string or null",
  "description": "string or null",
  "course": "string or null"
}

**Current Proposed Task:**
${JSON.stringify(currentProposedTask, null, 2)}

**Original Canvas Data:**
Title: "${canvasAssignment.name}"
Due: "${canvasAssignment.due_at}"
Course: "${canvasAssignment.context_name || 'Unknown'}"
URL: "${canvasAssignment.html_url || ''}"

**User Instructions:**
"${instructions}"

**Common Operations:**
- "Keep my description" → preserve the description from Proposed Task
- "Use Canvas title" → use the title from Canvas Data
- "Add [Canvas] prefix" → prepend "[Canvas] " to the title
- "Set time to 11:59 PM" → set time to "23:59"

Apply the user's instructions. Return ONLY the refined task object as valid JSON.
`;

        try {
            const completion = await this.createCompletion({
                messages: [
                    { role: 'system', content: 'You are a precise task merge assistant. You ONLY output valid JSON matching the exact schema provided. Time must be in HH:MM 24-hour format (e.g., "23:59" not "11:59 PM"). Follow user instructions exactly.' },
                    { role: 'user', content: prompt }
                ],
                model: modelName,
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            const text = completion.choices[0]?.message?.content || '{}';
            return JSON.parse(text);

        } catch (error) {
            console.error('Merge Refinement Error:', error);
            throw new Error('Failed to refine merge.');
        }
    }
}

export const aiService = new AIService();
