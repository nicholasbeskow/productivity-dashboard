import Groq from 'groq-sdk';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getString } from '../utils/storageManager';

const getApiKey = () => getString(STORAGE_KEYS.AI_API_KEY, '');
const getModelName = () => getString(STORAGE_KEYS.AI_MODEL, 'llama-3.3-70b-versatile');

class AIService {
    constructor() {
        this.groq = null;
    }

    _initClient() {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('AI API Key not found. Please configure it in Settings.');
        }
        // Initialize Groq client
        // dangerouslyAllowBrowser is required because we are running this in the Electron renderer process (React)
        this.groq = new Groq({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
        });
    }

    async validateApiKey(apiKey) {
        try {
            const groq = new Groq({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            });

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'llama-3.1-8b-instant', // Use smallest model for quick validation
            });

            return {
                success: true,
                message: `Connected! Response: "${completion.choices[0]?.message?.content?.slice(0, 20)}..."`
            };
        } catch (error) {
            console.error('API Key Validation Error:', error);
            if (error.message.includes('401')) {
                return { success: false, error: 'Invalid API Key (401).' };
            }
            return { success: false, error: error.message };
        }
    }

    async parseSyllabus(syllabusText) {
        this._initClient();
        const modelName = getModelName();

        const prompt = `
      You are an expert academic assistant. I have pasted text that might be a SYLLABUS, a CANVAS GRADEBOOK, or a MESSY TASK LIST.
      Your goal is to extract every single assignment, exam, quiz, project, or reading that has a specific due date.
      
      The text will be unstructured and messy.
      
      Parsing Priorities:
      1. **Canvas Gradebook**:
         - Often looks like: "Assignment Name Due: Jan 12 at 11:59pm Submitted: Jan 10 / 100 pts"
         - **CRITICAL RULE**: If a line has both "Due:" and "Submitted:", YOU MUST USE THE "Due:" DATE. The "Submitted" date is irrelevant for planning.
         - If a line ONLY has "Submitted:" and NO "Due:", ignore it (it's likely already done), UNLESS the user explicitly pasted a list of "Completed" items (unlikely). Assume "Submitted" only = DONE.
      2. **Syllabus**:
         - Hunt for "Schedule" or "Calendar". Ignore policies.
      3. **Generic Lists**:
         - "Read Chapter 5 by Friday" -> interpret "Friday" relative to Reference Date.
      
      Output Format:
      Return a STRICT JSON object with a single key "tasks":
      {
        "tasks": [
            {
                "title": "Exact Name",
                "dueDate": "YYYY-MM-DD", 
                "time": "HH:MM (24-hour format) OR null",
                "description": "Specific details or null"
            }
        ]
      }

      Rules:
      1. **Reference Date**: Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
      2. **Implicit Year**: Calculate based on Reference Date.
         - Canvas often hides the year. If today is Oct 2025 and Due is "Jan 12", it's Jan 12, 2026.
      3. **Strict Date Parsing**: Convert to YYYY-MM-DD.
      4. **No Hallucinations**: Do not invent tasks.
      5. **Messy Text Handling**:
         - "Fri\nFeb 9\nModule 1 Quiz" -> Date: Feb 9, Title: Module 1 Quiz
         - "Essay 1 Due: Oct 15 Submitted: Oct 12" -> Date: Oct 15 (Ignore Oct 12)
      
      Input Text:
      ${syllabusText}
    `;

        try {
            const completion = await this.groq.chat.completions.create({
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

            // Normalize: Ensure we have an array
            let tasks = [];
            if (Array.isArray(parsed)) {
                tasks = parsed;
            } else if (parsed && Array.isArray(parsed.tasks)) {
                tasks = parsed.tasks;
            } else {
                // Try to find any array in the object
                const values = Object.values(parsed);
                const arrayCandidate = values.find(v => Array.isArray(v));
                if (arrayCandidate) {
                    tasks = arrayCandidate;
                }
            }

            return tasks;

        } catch (error) {
            console.error('Syllabus Parsing Error:', error);
            throw new Error('Failed to parse syllabus. ' + error.message);
        }
    }

    async refineSyllabusTasks(currentTasks, instructions) {
        this._initClient();
        const modelName = getModelName();

        const prompt = `
      I have a list of tasks extracted from a syllabus. The user wants to modify them based on specific instructions.
      
      Current Tasks:
      ${JSON.stringify(currentTasks, null, 2)}
      
      User Instructions:
      "${instructions}"
      
      Goal:
      Return a STRICT JSON object with a single key "tasks" containing the updated list of tasks.
      - If the user says "remove readings", filter them out.
      - If the user says "change all dates to 2025", update them.
      - Keep existing fields (id, title, dueDate, time, course) unless instructed otherwise.
      - Do NOT add new tasks unless explicitly asked.
      
      Output Format:
      {
        "tasks": [ ... ]
      }
    `;

        try {
            const completion = await this.groq.chat.completions.create({
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
            }

            return tasks;

        } catch (error) {
            console.error('Syllabus Refinement Error:', error);
            throw new Error('Failed to refine tasks. ' + error.message);
        }
    }

    async matchCanvasToTasks(assignment, potentialMatches) {
        this._initClient();
        const modelName = getModelName();

        const prompt = `
      I need to check if a new Canvas assignment matches any existing tasks in my database to avoid duplicates.
      
      New Canvas Assignment:
      Title: "${assignment.name}"
      Due Date: "${assignment.due_at || 'No Match'}"
      Course: "${assignment.context_name || 'Unknown'}"
      
      Existing Potential Matches:
      ${JSON.stringify(potentialMatches.map(t => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            course: t.course
        })), null, 2)}
      
      Task:
      Analyze if the Canvas assignment is the SAME task as one of the potential matches.
      
      Matching Logic:
      1. **Fuzzy Titles**: "Bio Quiz 1" == "Biology 101: Quiz #1". "Ch 5 Reading" == "Read Chapter 5".
      2. **Flexible Dates**: 
         - A Canvas due date (e.g. Jan 12 @ 11:59PM) might match a user-entered date of Jan 12 OR Jan 13 (if midnight).
         - Allow for 1-2 day variance.
      3. **Course Context**: If the course matches, be more confident in title matches.
      
      Constraint:
      - If it seems like the SAME deliverable, return it as a match.
      - If unsure, bias towards returning a match with lower confidence so the user can decide.
      
      Output:
      Return a STRICT JSON object:
      {
        "matchId": "id-of-matching-task" OR null,
        "confidence": 0.0 to 1.0,
        "reason": "Brief explanation"
      }
    `;

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a JSON-only comparison bot.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.1-8b-instant', // Use fast model for matching
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
        this._initClient();
        const modelName = getModelName();

        const prompt = `
      I am refining a merged task based on user instructions.
      
      1. Current Proposed Task (Start from here):
      ${JSON.stringify(currentProposedTask, null, 2)}

      2. Canvas Assignment (Reference Data):
      Title: "${canvasAssignment.name}"
      Due: "${canvasAssignment.due_at}"
      Description: "${canvasAssignment.description ? canvasAssignment.description.substring(0, 300) : 'None'}"
      Link: "${canvasAssignment.html_url}"

      3. User Instructions:
      "${instructions}"

      Goal:
      Return the FINAL updated task object (JSON).
      - Start with the "Current Proposed Task" as the base.
      - Apply the "User Instructions" intelligently.
      - If the user asks to "reset" or "use canvas data", look at the Canvas Assignment section.
      - Otherwise, preserve the fields from "Current Proposed Task" unless specifically asked to change them.

      Output:
      Strict JSON of the merged task:
      {
        "title": "...",
        "dueDate": "...",
        "time": "...",
        "description": "...",
        "course": "...",
        "url": "..."
      }
    `;

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a JSON-only response bot.' },
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
