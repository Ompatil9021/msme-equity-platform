# Render Free Deployment Checklist

## 1) Push latest code
```bash
git add -A
git commit -m "chore: prepare render deployment"
git push origin main
```

## 2) Deploy backend (Render Web Service)
- Service Type: `Web Service`
- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Plan: `Free`

### Backend Environment Variables
Use these keys in Render backend service settings:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=replace-with-a-very-long-random-secret
CORS_ORIGINS=https://your-frontend-site.onrender.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=250
ALLOW_DEFAULT_ADMIN_SEED=false
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

Notes:
- In production, `JWT_SECRET` must be set and strong.
- `FIREBASE_PRIVATE_KEY` must keep escaped newlines (`\\n`) if stored in one line.

## 3) Deploy frontend (Render Static Site)
- Service Type: `Static Site`
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

### Frontend Environment Variables
```env
VITE_API_BASE_URL=https://your-backend-service.onrender.com
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_DEFAULT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_USE_HARDHAT=false
```

Optional Firebase vars for frontend (if needed):
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 4) Update backend CORS after frontend URL is known
- Set `CORS_ORIGINS` in backend to the exact Render frontend URL.
- Redeploy backend.

## 5) Deploy smart contract to testnet from local machine
In `blockchain/.env` (use `.env.example` as base):

```env
POLYGON_MUMBAI_RPC=https://rpc-mumbai.maticvigil.com
DEPLOYER_PRIVATE_KEY=your-private-key
POLYGONSCAN_API_KEY=
BACKEND_URL=https://your-backend-service.onrender.com
BACKEND_MSME_ID=msme_bcd8f891df25
```

Commands:
```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat run --network mumbai scripts/deploy.js
```

Then update frontend Render env:
- `VITE_CONTRACT_ADDRESS`
- `VITE_DEFAULT_CONTRACT_ADDRESS`

Redeploy frontend.

## 6) Smoke tests
- Backend health: `https://your-backend-service.onrender.com/health`
- Frontend opens and login works
- Admin login works (`admin@msme.local` only if seed is enabled in environment)
- Listings load
- Buy flow opens MetaMask and confirms transaction

## 7) Free plan behavior
- Backend service may sleep and cold-start on first request.
- Static site stays responsive.
