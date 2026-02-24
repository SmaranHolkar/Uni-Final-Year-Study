# Memory Optimization Guide

## Problem
The application was consuming excessive memory on Render's free tier due to:
1. Hugging Face Transformers ML model loaded in memory (~100-200MB)
2. No request size limits
3. Large file uploads (50MB)
4. No garbage collection optimization
5. Unlimited chunking (200 chunks per document)

## Solutions Implemented

### 1. Node.js Memory Management
**File: `backend/package.json`**
- Added `--max-old-space-size=512` flag to limit heap to 512MB
- Added `--expose-gc` flag to enable manual garbage collection

### 2. Embedding Model Optimization
**File: `backend/src/utils/aiUtils.js`**
- ✅ Added LRU cache (100 embeddings) to reduce model recomputation
- ✅ Auto-unload model after 5 minutes of inactivity
- ✅ Periodic cleanup interval
- ✅ Reduced memory overhead with `progress_callback: null`

### 3. Request Size Limits
**File: `backend/src/server.js`**
- Limited JSON body size to 10MB
- Added URL-encoded body limit (10MB)
- Periodic garbage collection every 60 seconds

**File: `backend/src/routes/documentRoutes.js`**
- Reduced file upload limit from 50MB to 10MB

### 4. Document Processing Optimization
**File: `backend/src/controllers/documentController.js`**
- Reduced MAX_CHUNKS from 200 to 100
- Force garbage collection every 20 chunks
- Added PDF parser cleanup (`pdfParser.destroy()`)

## Expected Memory Savings
- **Before**: ~300-400MB baseline + spikes to 600MB+
- **After**: ~150-250MB baseline with controlled spikes

## Monitoring
Monitor your Render logs for:
- `Loading embedding model (optimized)` - model loaded
- `Unloading embedding model due to inactivity` - model cleanup
- Memory usage in Render dashboard

## Additional Recommendations

### If still experiencing issues:
1. **Upgrade Render Plan** - Consider the $7/month Starter plan (512MB guaranteed)
2. **External Embedding API** - Switch to OpenAI embeddings API to remove ML model entirely
3. **Redis Caching** - Add Redis for persistent embedding cache
4. **Worker Separation** - Move document processing to a background worker

### Environment Variables
Make sure these are set in Render:
```
NODE_ENV=production
PORT=5000
GROQ_API=your_api_key
DATABASE_URL=your_db_url
```

## Testing Locally
Test memory optimizations locally:
```bash
cd backend
npm run dev
# Monitor with:
node --inspect src/server.js
# Then open chrome://inspect
```

## Deployment Checklist
- [x] Update package.json with memory flags
- [x] Add request size limits
- [x] Optimize embedding model
- [x] Reduce file upload limits
- [x] Add garbage collection
- [ ] Deploy to Render
- [ ] Monitor memory usage for 24 hours
- [ ] Adjust limits if needed
