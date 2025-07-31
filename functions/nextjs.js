const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const next = require("next");

// Set global options for Firebase Functions
setGlobalOptions({ 
  maxInstances: 10,
  region: "asia-northeast3" // Seoul region for better performance
});

// Initialize Next.js app
const dev = process.env.NODE_ENV !== "production";
const path = require("path");

// Next.js 앱 디렉토리 설정 - functions 폴더의 상위 디렉토리
const nextAppDir = path.join(__dirname, "..");

const app = next({
  dev,
  // Next.js 앱이 빌드된 위치 지정
  dir: nextAppDir,
  conf: {
    distDir: ".next"
  }
});

const handle = app.getRequestHandler();

// Next.js 준비 프로미스
let appReady = false;
const prepareApp = async () => {
  if (!appReady) {
    console.log("Preparing Next.js app...");
    await app.prepare();
    appReady = true;
    console.log("Next.js app ready!");
  }
};

// Main Next.js serving function
exports.nextjsFunc = onRequest({
  maxInstances: 10,
  memory: "1GiB",
  timeoutSeconds: 60,
  region: "asia-northeast3"
}, async (req, res) => {
  try {
    // Next.js 앱 준비
    await prepareApp();
    
    // CORS 헤더 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Next.js에 요청 전달
    await handle(req, res);
  } catch (error) {
    console.error("Error in nextjsFunc:", error);
    
    // 에러 발생 시 간단한 응답
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Next.js function failed to process request"
      });
    }
  }
});

// Health check function for Firebase Functions
exports.health = onRequest((req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "vocabulary-app-functions"
  });
});