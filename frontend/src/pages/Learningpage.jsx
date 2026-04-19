// Hosts the learning flow page with sidebar and multi-step form.
import React from 'react';
import '../App.css';

import MultiStepForm from '../components/Mainlearningcontainer.jsx';

// Composes the learning page shell around the multi-step learning form.
export default function Learningpage() {
  return (
    <>
     

      <main className="main-content">
        <MultiStepForm />
      </main>
    </>
  );
}
