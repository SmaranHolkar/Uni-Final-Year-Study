import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StepOne from "./slides/StepOne.jsx";
import StepTwo from "./slides/Steptwo.jsx";

// Handles MultiStepForm logic.
export default function MultiStepForm() {
  const location = useLocation();
  const retakePayload = location.state?.retakePayload || null;
  const [step, setStep] = useState(retakePayload ? 2 : 1);
  const navigate = useNavigate();

  // This function gets called when Step 1 finishes (document upload)
  const handleDocumentUpload = () => {
    setStep(2); // Move to quiz
  };

  // This function gets called when Step 2 finishes
  const handleQuizFinish = (data, results) => {
    // Navigate to Learning Playground, passing the quiz results and wrong questions (if they exist in data)
    navigate("/Learningplayground", { state: { quizResults: results, mindmapData: data } });
  };

  return (
    <div style={styles.container}>
      {step === 1 && <StepOne onNext={handleDocumentUpload} />}
      
      {step === 2 && <StepTwo onNext={handleQuizFinish} retakePayload={retakePayload} />}
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    padding: "40px",
    border: "none",
    borderRadius: "0",
    background: "transparent",
    color: "var(--card-foreground)",
    minHeight: "60vh"
  }
};
