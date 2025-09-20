const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

exports.startNewActivity = onRequest({ cors: ["https://improvewritingapp.web.app"] }, (req, res) => {
    // The v2 onRequest function has built-in CORS support.
    
    logger.info("startNewActivity function triggered", { structuredData: true });

    // TODO: 여기에 새 활동 시작을 위한 실제 로직을 추가하세요.
    // 예: Firestore에 새 문서 생성.
    
    res.status(200).send({ message: "New activity started successfully!" });
});