# 6.2 Implementation

*Word count: ~2500 words. This section explains how the main parts of the project's code work. It looks at how the platform uses the code step-by-step for the core features.*

This section explains the main codebase for Hydrus Learn by looking at how the features are actually used. The platform takes a student's PDF files and turns them into custom quizzes. It also creates mindmaps to correct mistakes, analyzes how the student learns, and builds interactive learning tools on the spot. 

We will go through five main features: RAG (Retrieval-Augmented Generation) document processing, Quiz Creation, Mindmap Generation, Metacognitive Analysis, and the Learning Playground. We will look at both the backend (handling data) and the frontend (what the user sees). We will also point out special code written for this project and any open-source tools that were used.

---

## 6.2.1 RAG (Retrieval-Augmented Generation) Document Processing

**Use Case:** A student uploads a PDF textbook or lecture slides. The app needs to read the file, clean up the text, break it into smaller pieces, and turn it into searchable data. This stops the AI from making up facts because it forces it to only use information from the document.

### 6.2.1.1 Document Processing and Chunking (Backend)

When the user uploads a file on the React website, the Node.js backend receives it using a tool called `multer`. The raw text is pulled out of the file and cleaned up. Because AI models can't read an entire 100-page book at once, the text has to be split into smaller sections called "chunks."

The code splits the text into chunks of 1,000 characters. To make sure no sentences get cut in half where they lose their meaning, each chunk overlaps the previous one by 100 characters.

### 6.2.1.2 Local Text Embeddings and Database Search (Adopted Code)

To search through the chunks later, the text has to be turned into a list of numbers, which is called an "embedding." Instead of paying an outside company like OpenAI to do this, the system does it locally on the server.

**Adopted Source:** The code uses the `@huggingface/transformers` library (made by HuggingFace and Xenova) to run machine learning models directly inside the Node.js backend. 

The exact model used is `Xenova/all-MiniLM-L6-v2`. This model is fast and accurate, turning chunks of text into a list of 384 numbers. 

After these numbers are created, they are saved in a PostgreSQL database. To allow the database to search these numbers quickly, an open-source extension called `pgvector` (made by Andrew Kane) was added to the database.

*Snippet 1: Code for processing and embedding text locally (backend/src/controllers/documentController.js)*
```javascript
export async function processAndStoreDocument(req, res) {
  const client = await pool.connect();
  const title = req.body.title?.trim() || 'Untitled Document';
  const userId = req.user?.id;
  
  // 1. Text Extraction & Cleaning
  const text = await extractTextFromFile(req.file.path, req.file.mimetype);
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // 2. Break text into chunks (1000 characters, 100 overlap)
  const chunks = chunkText(cleanText, 1000, 100).slice(0, 500);

  await client.query('BEGIN');
  try {
    for (let i = 0; i < chunks.length; i++) {
      // 3. Create embeddings using HuggingFace models
      const embedding = await getEmbedding(chunks[i]);
      
      // 4. Save to database using pgvector
      await client.query(
        `INSERT INTO public.w_embeddings (title, chunk_text, embedding, user_id, created_at)
         VALUES ($1, $2, $3::vector, $4, NOW())`,
        [title, chunks[i], `[${embedding.join(',')}]`, userId]
      );
    }
    await client.query('COMMIT');
    res.status(200).json({ success: true, processedChunks: chunks.length });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Vectorization failed' });
  } finally {
    client.release();
  }
}
```

---

## 6.2.2 Quiz Generation (Backend / Frontend)

**Use Case:** A student wants to test themselves on the uploaded material. The system must create a multiple-choice quiz based only on what the student wants to study, preventing the AI from using outside knowledge.

### 6.2.2.1 Searching the Database and Prompting the AI (Backend)

The quiz creation starts by looking at what the user asked for (like "Generate questions on Thermodynamics"). The system turns this request into numbers (an embedding) just like it did with the document text. The `getTopChunks()` function in `aiUtils.js` then uses a special math search called Euclidean distance (`<->`) in PostgreSQL to find the 15 paragraphs from the textbook that best match the student's request.

*Snippet 2: Finding matching text chunks in the database (backend/src/utils/aiUtils.js)*
```javascript
// Retrieve top K similar text chunks from DB using vector similarity search
export async function getTopChunks(embedding, k = 10, userId = null, documentId = null) {
  const vec = `[${embedding.join(',')}]`;
  const client = await pool.connect();
  try {
    let query, params;
    
    if (documentId) {
      // Filter by specific document using the document's title
      query = `SELECT id, chunk_text, title FROM public.w_embeddings 
               WHERE title = (SELECT title FROM public.w_embeddings WHERE id = $3)
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, documentId];
    } else if (userId) {
      // Filter by user_id if provided
      query = `SELECT id, chunk_text, title FROM public.w_embeddings 
               WHERE user_id = $3
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, userId];
    } else {
      // Get all chunks if no user filter
      query = `SELECT id, chunk_text, title FROM public.w_embeddings 
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k];
    }
    
    const { rows } = await client.query(query, params);
    return rows;
  } finally {
    client.release();
  }
}
```

These 15 paragraphs are bundled together and sent to the Llama 3.1 AI model through the Groq API. A very strict rule is set in the code to ensure the AI replies with a proper JSON format. If it answered like a normal chat, the website wouldn't be able to read the questions. The AI is forced to provide arrays containing the `prompt`, `choices`, and the correct `answer`.

### 6.2.2.2 Quiz Interface and Tracking (Frontend)

In the React frontend (`StepTwo.jsx`), the system handles how the quiz is displayed to the user. A unique feature added here is how the app tracks the user's behavior. Instead of just marking answers right or wrong, the code uses React `useRef` hooks to secretly track how long it takes to answer (`answerTimestamps`) and how many times the user changes their mind before submitting (`answerChangeCounts`). 

*Snippet 3: Behavioral Tracking in Quiz UI (frontend/src/components/slides/Steptwo.jsx)*
```javascript
  const answerTimestamps = useRef({}); 
  const answerChangeCounts = useRef({}); 

  const selectAnswer = (i, choice) => {
    const copy = [...answers];
    // Save the time the first answer was picked
    if (answerTimestamps.current[i] === undefined) {
      answerTimestamps.current[i] = Date.now();
    } else {
      // Track how many times they changed their answer
      answerChangeCounts.current[i] = (answerChangeCounts.current[i] || 0) + 1;
    }
    copy[i] = choice;
    setAnswers(copy);
  };
```

When the user clicks "Finish Quiz", the system grades the answers and immediately sends the incorrect answers to the backend to create the review mindmap.

---

## 6.2.3 Mindmap Generation (Backend / Frontend)

**Use Case:** When a student gets a question wrong, the application builds an interactive mindmap pointing out their exact mistakes and explaining the correct answer so they can learn from it.

### 6.2.3.1 Creating Mindmap Explanations (Backend)

The backend handles this inside the `generateMindmap` controller. For every wrong answer, the system searches the database again to find the exact paragraph the question came from. 

It then sends the question, the student's wrong answer, and the textbook paragraph to the AI. The AI is asked to act like a helpful teacher, explaining why the student got it wrong in 8 lines or less. These helpful explanations are sent back to the frontend as a list of connected topics (called "nodes").

### 6.2.3.2 Displaying the Mindmap (Frontend)

To draw the mindmap cleanly on the screen without the text boxes crashing into each other, the app uses a graph package.

**Adopted Source:** The user interface uses the `@xyflow/react` library (created by webkid GmbH). 

To ensure the mindmap looks organized, custom code was written in `StepThree.jsx`. It uses an algorithm called Breadth-First Search (BFS) to arrange the topics. It figures out how many topics there are and spreads them out neatly, placing each box exactly 200 pixels apart on the screen.

*Snippet 4: Custom Node Layout Algorithm (frontend/src/components/slides/StepThree.jsx)*
```javascript
    // Calculate positions using BFS to make a top-down tree
    const positions = {};
    const depthLevels = {};
    const queue = roots.map((r) => ({ id: r.id, depth: 0 }));

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);

      if (!depthLevels[depth]) depthLevels[depth] = [];
      depthLevels[depth].push(id);

      if (children[id]) {
        children[id].forEach((childId) => queue.push({ id: childId, depth: depth + 1 }));
      }
    }

    // Set exact pixel locations for the UI layout
    Object.entries(depthLevels).forEach(([depth, nodeIds]) => {
      const y = parseInt(depth) * 200; // Vertical spacing
      const totalWidth = (nodeIds.length - 1) * 200;
      const startX = -totalWidth / 2; // Keep it centered

      nodeIds.forEach((id, idx) => {
        positions[id] = { x: startX + idx * 200, y }
      });
    });
```

Students can also interact with these boxes. For example, they can click "Add Similar Topic" and the system will ask the AI to naturally add a new box with a related concept to the screen.

---

## 6.2.4 Metacognitive Analysis (Backend / Frontend)

**Use Case:** The app tries to explain *why* a student failed by looking at their learning habits. By asking students to rate how confident they are (from 1 to 5) before submitting an answer, the app can warn them if they are constantly highly confident about wrong answers.

### 6.2.4.1 Tracking Errors with Simple Rules (Backend)

Asking an AI to do math with a lot of heavy data can lead to mistakes. Because of this, the `generateMetacognitiveAnalysis` function in the backend doesn't make the AI do the math. Instead, it uses simple programmed rules to group errors into categories based on confidence ratings:

- **Conceptual Misunderstanding:** The student got it wrong but was highly confident (score 4-5). This means they believe something that is false.
- **Recall Failure:** The student got it wrong and had low confidence (score 1-2). They just forgot the facts.
- **Careless Error:** Average confidence on wrong answers.

After the code counts these errors, it sends the final numbers to the AI. This way, the AI can write a readable summary of the student's learning habits without getting confused by the math.

*Snippet 5: Rule-based Error Calculation (backend/src/utils/aiUtils.js)*
```javascript
    // Check if confidence matches accuracy
    const calibrated = questions.filter((q) => {
      const conf = q?.confidence;
      if (conf == null) return false;
      return (conf >= 4) === Boolean(q.isCorrect);
    }).length;

    // Group the wrong answers based on rules
    incorrectQuestions.forEach((q) => {
      const conf = q?.confidence;
      if (conf == null) {
        errorTypeProfile.unclassified++;
      } else if (conf >= 4) {
        errorTypeProfile.conceptualMisunderstanding++; // Bad habit: confident but wrong
      } else if (conf <= 2) {
        errorTypeProfile.recallFailure++; // Just forgot the answer
      } else {
        errorTypeProfile.carelessError++;
      }
    });
```

### 6.2.4.2 Visualizing the Dashboard results (Adopted Code)

**Adopted Source:** To show this tracked data to the user, the app uses `Chart.js` and the React wrapper `react-chartjs-2` (created by Chart.js contributors). 

The `MetacognitiveAnalysis.jsx` dashboard displays a large Radar Chart. It shows variables like "Accuracy," "Confidence," and "Speed." If a student is answering very fast but getting every question wrong, the chart's shape will warp, showing them immediately that they need to stop rushing. 

---

## 6.2.5 AI Learning Playground (Mainly Backend)

**Use Case:** If a student keeps failing a certain topic, reading more text isn't always helpful. In the playground, they can type "Teach me thermodynamics" and the system will actively build a custom mini-game (like flashcards or a matching game) on the spot to teach them.

### 6.2.5.1 The Two-Step AI Process (Backend)

Asking the AI to design a game and write perfect website code all in one try usually causes the app to crash. To fix this, the app uses a custom strategy.

**Step 1: Planning.** The first request asks the AI to ignore writing code and instead just act as a game planner. It picks what type of tool to build (like `flashcard` or `timeline`) and plans out what should go inside it. The output is strictly kept as JSON data.

**Step 2: Coding.** The system takes the JSON plan and sends a separate request to the AI, asking it to write raw HTML code based on the plan. This solves the crashing issue because the complex parts are handled separately.

The code also ensures the AI games match the website's dark-mode colors by forcing the AI to paste a specific block of CSS styles `TOOL_THEME_CSS` into its output.

*Snippet 6: Enforcing the App's Colors during AI Code Generation (backend/src/utils/aiUtils.js)*
```javascript
  const buildPrompt = `
You are building an interactive HTML learning tool. Return ONLY the raw HTML.

TOOL TYPE   : ${toolType}
TITLE       : ${title}
CONTENT DATA: const DATA = ${itemsJson}; 

REQUIRED PAGE STRUCTURE:
<div id="app">
  <header id="app-header">...</header>
  <main id="app-main"></main>
</div>

Use the CSS classes defined below for ALL buttons, cards, and colors.
Do NOT use other styles. 

THEME_CSS (paste verbatim inside your <style> block):
${TOOL_THEME_CSS}
`;
```

### 6.2.5.2 Keeping the App Safe from Hackers (Frontend)

Allowing AI to write raw Javascript code and running it on the student's browser is highly dangerous. If the AI hallucinates, the Javascript code could accidentally steal the user's login tokens and cause a "Cross-Site Scripting" (XSS) security risk. 

To prevent this, the code runs the AI game inside an isolated `<iframe>`. The app uses the `sandbox="allow-scripts"` setting while removing the origin permissions. This means the flashcards work normally inside their own little box, but they are completely blocked from accessing the student's sensitive data or the main website.

---

## 6.2.6 AI-Assisted Development (GitHub Copilot)

Throughout the project, GitHub Copilot was actively used as an assistant inside the code editor to speed up development and help solve complex coding problems. It was mainly used for:

1. **Writing Algorithms:** Setting up the math for the mindmap nodes (Section 6.2.3.2) was tricky. Copilot helped auto-complete the spacing formulas, which stopped the UI boxes from drawing on top of each other.
2. **Database Queries:** Copilot helped write the complicated SQL queries required for the RAG search. It suggested the proper way to use the `<->` math operators for the `w_embeddings` database table when matching text chunks.
3. **Basic Setup Code:** Copilot was very helpful in quickly writing out standard code, like setting up React variables and Express server routes, saving hours of manual typing.
4. **Brainstorming:** During the planning of the Learning Playground, Copilot was used in a chat interface to brainstorm how to stop the AI code from crashing the web page. This discussion helped formulate the two-step game generation process.

Using Copilot for math, database lookups, and basic typing allowed for more focus to be placed on designing the system architecture and writing secure code.
