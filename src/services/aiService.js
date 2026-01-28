import Groq from 'groq-sdk';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getString } from '../utils/storageManager';

// Split by comma or newline, trim, and filter empty
const getApiKeys = () => {
    const raw = getString(STORAGE_KEYS.AI_API_KEY, '');
    return raw.split(/[\n,]+/).map(k => k.trim()).filter(k => k.startsWith('gsk_'));
};
const getModelName = () => 'openai/gpt-oss-120b';

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

    /**
     * Predict task duration based on historical data using AI semantic matching
     * @param {Object} task - The task to predict duration for
     * @param {Array} historicalData - Array of past completion entries
     * @returns {Object} { predictedMinutes, confidencePercent, sampleCount }
     */
    async predictTaskDuration(task, historicalData) {
        if (!historicalData || historicalData.length === 0) {
            return null;
        }

        const modelName = getModelName();
        const prompt = `Predict task duration. Be LIBERAL—provide a prediction if any reasonable match exists.

    TARGET: "${task.title}" | Course: "${task.course || 'NONE'}" | Category: ${task.taskType || 'personal'}

    HISTORY (recent first):
    ${JSON.stringify(historicalData.slice(0, 20).map((h, i) => ({
            t: h.title, c: h.course || '-', m: h.durationMinutes, r: i < 8 ? 'R' : 'O'
        })))}

    STEP 1 — EXTRACT TYPE FROM TITLE (case-insensitive):
    hw/homework/pset→HOMEWORK | quiz→QUIZ | exam/midterm/final/test→EXAM | read/reading/chapter→READING
    study/review for→STUDY | project/paper/essay/report→PROJECT | lab→LAB | discussion/post/forum→DISCUSSION
    worksheet/exercise→WORKSHEET | lecture/notes→REVIEW | meeting/call/appt→MEETING | else→GENERAL

    STEP 2 — TIERED MATCHING (use best available):
    TIER 1 (60-90%): Same type + same course. "HW 5"(CS101)↔"HW 3"(CS101)✓
    TIER 2 (40-65%): Same type, different course. "HW 5"(CS101)↔"HW 2"(MATH200)✓
    TIER 3 (25-45%): Semantically similar. "Grocery shopping"↔"Buy groceries"✓
    Never match: Academic↔Personal, or different types (HW↔Quiz↔Exam). Ignore numbers in titles.

    STEP 3 — CALCULATE:
    • Weight R (recent) 2x more than O (older)
    • If 4+ matches: exclude outliers >2x or <0.5x median
    • Boost +5% if category matches, -5% if differs
    • High variance (3x+ spread): reduce confidence 10-15%
    • Min prediction: 5 minutes

    CONFIDENCE: T1+3recent=80-90% | T1+1-2=60-75% | T2+2=50-65% | T2+1=40-55% | T3=25-45max | NoMatch=null

    OUTPUT JSON: {"predictedMinutes":<num|null>,"confidencePercent":<0-100>,"similarTasksFound":<count>,"reasoning":"<brief>"}`;

        // Retry with exponential backoff
        const delays = [1000, 2000, 4000];
        let lastError = null;

        for (let attempt = 0; attempt <= delays.length; attempt++) {
            try {
                const completion = await this.createCompletion({
                    messages: [
                        { role: 'system', content: 'You are a task duration prediction engine. Your job is to find the most relevant historical tasks and provide an accurate time estimate. Be liberal - provide a prediction if any reasonable match exists. Weight recent data more heavily. Output only valid JSON matching the exact schema provided.' },
                        { role: 'user', content: prompt }
                    ],
                    model: modelName,
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                });

                const text = completion.choices[0]?.message?.content || '{}';
                const result = JSON.parse(text);

                if (result.predictedMinutes) {
                    console.log('[AIService] Duration prediction:', result);
                    return {
                        predictedMinutes: result.predictedMinutes,
                        confidencePercent: result.confidencePercent || 50,
                        sampleCount: result.similarTasksFound || 1
                    };
                }
                return null;

            } catch (error) {
                lastError = error;
                console.warn(`[AIService] Duration prediction attempt ${attempt + 1} failed:`, error.message);

                if (attempt < delays.length) {
                    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                }
            }
        }

        console.error('[AIService] Duration prediction failed after retries:', lastError?.message);
        return null;
    }

    /**
     * Generate a fun congratulatory message for task completion
     * @param {Object} task - The completed task
     * @returns {string} Congratulatory message
     */
    async generateCongratMessage(task) {
        const fallbackMessages = [
            `Nice work finishing "${task.title}"! 🎉`,
            `"${task.title}" is done! You're crushing it! 💪`,
            `Another one bites the dust! "${task.title}" complete! ✨`,
            `Boom! "${task.title}" is off your plate! 🚀`,
            `"${task.title}"? Done and dusted! 🏆`
        ];

        try {
            const completion = await this.createCompletion({
                messages: [
                    {
                        role: 'system',
                        content: 'You generate short, fun, encouraging congratulatory messages for task completion. Be playful but professional. Use 1-2 emojis. Keep it under 15 words. Output just the message text, no quotes.'
                    },
                    {
                        role: 'user',
                        content: `Generate a congratulatory message for completing this task: "${task.title}"${task.course ? ` (for ${task.course})` : ''}`
                    }
                ],
                model: 'llama-3.1-8b-instant', // Fast model for quick response
                temperature: 0.9, // Higher creativity
                max_tokens: 50
            });

            const message = completion.choices[0]?.message?.content?.trim();
            return message || fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

        } catch (error) {
            console.warn('[AIService] Congrat message generation failed, using fallback');
            return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
        }
    }
}

export const aiService = new AIService();
