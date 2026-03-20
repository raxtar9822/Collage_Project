# 🔧 Deployment Troubleshooting Guide

## Error: "npm ci --only=production" failed

### ✅ FIXED!
The Dockerfile has been updated to use:
- `node:18-slim` (instead of alpine)
- `npm ci --omit=dev` (instead of deprecated `--only=production`)

**Just re-deploy on Render and it should work!**

---

## If You Still Get Build Errors:

### **Option 1: Clear Render Build Cache**
1. In Render dashboard, go to your service
2. Click "Settings" → "Clear Build Cache"
3. Click "Manual Deploy" → "Deploy Latest Commit"

### **Option 2: Use Alternative Dockerfile**
If the main Dockerfile still has issues, rename the alternative:

```bash
# On your computer
mv Dockerfile Dockerfile.production
mv Dockerfile.alt Dockerfile
git add .
git commit -m "Use alternative Dockerfile with full dependency install"
git push origin main
```

Then re-deploy on Render.

---

## **Common Deployment Issues & Solutions:**

### **1. Build Timeout**
- **Problem:** Build takes too long
- **Solution:** 
  - Clear build cache on Render
  - Wait 15 minutes before retrying
  - Check Render logs for detailed errors

### **2. Native Module Build Failure**
- **Problem:** `better-sqlite3` fails to build
- **Solution:** Already handled with `node:18-slim`
- **Alternative:** Use the `Dockerfile.alt` above

### **3. Out of Memory**
- **Problem:** Build runs out of memory
- **Solution:**
  - This is a Render limitation on free tier
  - Upgrade to paid plan, or
  - Reduce npm cache:
    ```bash
    npm cache clean --force
    git push origin main
    ```

### **4. Missing Dependencies**
- **Problem:** npm install can't find packages
- **Solution:** Ensure `package-lock.json` is committed
  ```bash
  git add package-lock.json
  git commit -m "Add lock file"
  git push origin main
  ```

---

## **Deployment Checklist:**

- ✅ Dockerfile uses `node:18-slim`
- ✅ package.json exists with all dependencies
- ✅ package-lock.json committed to git
- ✅ .env.example has all required variables
- ✅ No large files in .gitignore
- ✅ Start command: `npm start`

---

## **Quick Fix Steps:**

```bash
# 1. Make sure you're in the right directory
cd d:\COLLAGE_PROJECT

# 2. Check Dockerfile
cat Dockerfile

# 3. Verify package.json
cat package.json

# 4. Commit and push
git add .
git commit -m "Fix deployment issues"
git push origin main

# 5. On Render:
# - Go to your service
# - Click "Clear Build Cache"
# - Click "Manual Deploy"
# - Watch the logs
```

---

## **Test Locally First:**

```bash
# Build Docker image locally
docker build -t hospital-meals .

# Run container
docker run -p 3000:3000 hospital-meals

# Visit http://localhost:3000
```

---

## **Still Having Issues?**

✅ Check Render Logs:
- Service → Logs tab
- Look for error messages

✅ Common fixes:
- Clear cache + redeploy
- Update Dockerfile
- Delete service and recreate
- Check environment variables are set

✅ Verify locally:
- `npm install`
- `npm start`
- Should run without errors

---

## **Success Indicators:**

When deployment works, you'll see:
```
✔ npm install completed
✔ Dockerfile built successfully
✔ Container started
✔ Listening on port 3000
```

Your app URL: `https://hospital-meals.onrender.com`

---

**Last Updated:** March 20, 2026
**Status:** Dockerfile Fixed ✅
