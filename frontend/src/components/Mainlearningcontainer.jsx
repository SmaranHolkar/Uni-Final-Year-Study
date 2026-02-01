import React, { useState } from "react";
import StepOne from "./slides/StepOne.jsx";
import StepTwo from "./slides/Steptwo.jsx";
import StepThree from "./slides/StepThree.jsx"; // We'll create this next

export default function MultiStepForm() {
  const [step, setStep] = useState(1);
  const [mindmapData, setMindmapData] = useState(null);

  // This function gets called when Step 1 finishes (document upload)
  const handleDocumentUpload = () => {
    setStep(2); // Move to quiz
  };

  // This function gets called when Step 2 finishes
  const handleQuizFinish = (data) => {
    setMindmapData(data); // Save the mindmap JSON
    setStep(3);           // Move to the next slide
  };

  return (
    <div style={styles.container}>
      {step === 1 && <StepOne onNext={handleDocumentUpload} />}
      
      {step === 2 && <StepTwo onNext={handleQuizFinish} />}
      
      
      {step === 3 && (
        <StepThree 
          data={mindmapData} 
          onRetake={() => setStep(2)} 
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    padding: "40px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "var(--card)",
    color: "var(--card-foreground)",
    minHeight: "60vh"
  }
};