//index.ts
// 
import express from "express";
import handleResumeUpload from "./pages/api/handle-resume-upload";
import storageRouter from "./services/storage";

const app = express();
app.use(express.json());

// ✅ Déclare bien les routes API
app.use("/api/upload", handleResumeUpload);
app.use("/api/storage", storageRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${port}`);
});
