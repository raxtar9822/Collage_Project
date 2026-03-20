# 🎯 QUICK START: Deploy FREE in 5 Steps

## Step 1️⃣ - Create GitHub Account
- Visit https://github.com/signup
- Create free account

## Step 2️⃣ - Create GitHub Repository
```bash
git init
git add .
git commit -m "Hospital Meals App"
git remote add origin https://github.com/YOUR_USERNAME/hospital-meals.git
git branch -M main
git push -u origin main
```

## Step 3️⃣ - Create Render Account
- Visit https://render.com
- Sign up with GitHub
- Click "Authorize"

## Step 4️⃣ - Deploy
1. In Render, click **"New +"** button
2. Select **"Web Service"**
3. Choose **"hospital-meals"** repository
4. Set:
   - **Name:** hospital-meals
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **"Create Web Service"**

## Step 5️⃣ - Configure Environment
In Render dashboard, go to **Environment**:
```
NODE_ENV = production
JWT_SECRET = your_secret_key_123
PORT = 3000
```

## ✅ DONE!
Your app will be live at: `https://hospital-meals.onrender.com`

**Demo Logins:**
- Mess: mess / mess123
- Admin: admin / admin123

---

## 💡 Tips
- First deployment takes 5-10 minutes
- Free tier spins down after 15 minutes of inactivity
- Create strong JWT_SECRET:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Check Render logs if something goes wrong: Logs tab in dashboard

---

**Total Time: ~20 minutes** ⏱️
**Cost: $0** 💰
**Difficulty: Easy** ✨
