# Document Upload and Embedding Storage

## Setup Instructions

### 1. Install Required Backend Packages

```bash
cd backend
npm install multer
```

### 2. Update Database Schema

Run the SQL migration in your Supabase SQL editor:
```sql
-- See backend/migration_add_source_file.sql
```

This adds `source_file` and `created_at` columns to your `w_embeddings` table.

### 3. Optional: Install PDF/DOCX Parsers

For full file type support, install these packages:

```bash
# For PDF support
npm install pdf-parse

# For DOC/DOCX support  
npm install mammoth
```

Then uncomment the relevant code in `backend/src/controllers/documentController.js`

## How It Works

### Frontend Flow

1. **User uploads document** in `StepOne.jsx`
   - Drag & drop or file browser
   - Validates file type (PDF, DOC, DOCX, TXT)
   - Max 10MB file size

2. **File sent to backend** via FormData
   ```javascript
   const formData = new FormData();
   formData.append("document", file);
   fetch(`${API_BASE}/api/upload-document`, {
     method: "POST",
     body: formData
   });
   ```

3. **Proceeds to quiz** (StepTwo) after successful upload

### Backend Flow

1. **Multer receives file** (`documentRoutes.js`)
   - Saves to `backend/uploads/` directory
   - Validates file type and size

2. **Text extraction** (`documentController.js`)
   - Currently supports: `.txt` files natively
   - Requires packages for: PDF, DOC, DOCX

3. **Chunking**
   - Splits text into ~500 word chunks
   - 50 word overlap between chunks for context

4. **Embedding generation**
   - Uses `Xenova/all-MiniLM-L6-v2` model
   - Same model used for question generation

5. **Database storage**
   - Inserts into `public.w_embeddings` table
   ```sql
   INSERT INTO public.w_embeddings (chunk_text, embedding, source_file, created_at)
   VALUES ($1, $2::vector, $3, NOW())
   ```

## Database Schema

Your `w_embeddings` table should have:

```sql
CREATE TABLE public.w_embeddings (
  id SERIAL PRIMARY KEY,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(384) NOT NULL,  -- Dimension depends on your model
  source_file TEXT,                -- Added by migration
  created_at TIMESTAMP DEFAULT NOW() -- Added by migration
);

-- Index for vector similarity search
CREATE INDEX ON public.w_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Index for source file queries
CREATE INDEX ON public.w_embeddings (source_file);
```

## File Type Support

### Currently Supported
- ✅ `.txt` - Plain text files (no additional packages needed)

### Requires Additional Packages
- 📄 `.pdf` - Requires `pdf-parse` package
- 📄 `.doc/.docx` - Requires `mammoth` package

## API Endpoints

### Upload Document
```
POST /api/upload-document
Content-Type: multipart/form-data

Body: document (file)

Response: {
  success: true,
  stats: {
    originalName: "lecture_notes.txt",
    textLength: 5000,
    totalChunks: 12,
    storedChunks: 12
  }
}
```

### Delete Document Embeddings
```
DELETE /api/document/:filename

Response: {
  success: true,
  message: "Document and embeddings deleted",
  deletedEmbeddings: 12
}
```

## Testing

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `/learningpage`
4. Upload a `.txt` file
5. Check Supabase to see embeddings in `w_embeddings` table

## Troubleshooting

### "PDF extraction not yet implemented"
Install: `npm install pdf-parse`
Then uncomment PDF code in `documentController.js`

### "DOC/DOCX extraction not yet implemented"  
Install: `npm install mammoth`
Then uncomment DOCX code in `documentController.js`

### "Failed to process document"
- Check file size (max 10MB)
- Verify file type is supported
- Check backend console for detailed errors
- Ensure database connection is working

## Next Steps

After upload, the system will:
1. ✅ Store embeddings in database
2. ✅ Generate questions from uploaded content (StepTwo uses same embeddings)
3. ✅ Create personalized mind map based on wrong answers (StepThree)
