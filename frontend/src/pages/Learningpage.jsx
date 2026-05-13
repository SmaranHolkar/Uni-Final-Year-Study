// Hosts the learning flow page with sidebar and multi-step form.
import React from 'react';
import '../App.css';
import { DotGrid } from '../components/Reveal.jsx';

import MultiStepForm from '../components/Mainlearningcontainer.jsx';

// Composes the learning page shell around the multi-step learning form.
export default function Learningpage() {
  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--background)' }}>
        <DotGrid />
        <main className="main-content" style={{ position: 'relative', zIndex: 10 }}>
          <MultiStepForm />
        </main>
      </div>
    </>
  );
}
